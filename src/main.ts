/**
 * Application bootstrap
 *
 * Key decisions:
 *  - Raw body preservation for webhook signature verification (Stripe/Razorpay
 *    both require the exact raw bytes to compute HMAC).
 *  - Helmet for security headers.
 *  - Global validation pipe with strict class-transformer settings.
 *  - Swagger only in non-production environments.
 *  - Graceful shutdown on SIGTERM / SIGINT (closes DB + Redis connections).
 *  - Correlation ID header piped through pino logger.
 *  - Trust proxy enabled for correct IP resolution behind Nginx / load balancer.
 */

import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Preserve the raw body buffer so webhook controllers can verify signatures.
    // The rawBody option attaches req.rawBody alongside the parsed JSON body.
    rawBody: true,
    bufferLogs: true,
  });

  // ── Pino structured logger ──────────────────────────────────────────────
  app.useLogger(app.get(Logger));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const env = configService.get<string>('NODE_ENV', 'development');
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');

  // ── Trust proxy (Nginx / AWS ALB / GCP LB) ─────────────────────────────
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // ── Security middleware ─────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: env === 'production',
    }),
  );
  app.use(compression());

  // ── CORS ────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // ── Global prefix ───────────────────────────────────────────────────────
  app.setGlobalPrefix(apiPrefix);

  // ── API versioning (URI style: /api/v1/) ────────────────────────────────
  app.enableVersioning({ type: VersioningType.URI });

  // ── Global pipes ────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,          // auto-transform payloads to DTO instances
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global interceptors ─────────────────────────────────────────────────
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // ── Swagger (non-production only) ───────────────────────────────────────
  if (env !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Payment Microservice')
      .setDescription('Production-grade Payment + Billing + Subscription API')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', in: 'header', name: 'x-api-key' }, 'api-key')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // ── Start server ────────────────────────────────────────────────────────
  await app.listen(port);
  app.get(Logger).log(`🚀 Payment Microservice running on port ${port} [${env}]`, 'Bootstrap');

  // ── Graceful shutdown ───────────────────────────────────────────────────
  // NestJS calls app.close() which triggers onModuleDestroy hooks in
  // PrismaService and Redis — this ensures in-flight jobs complete cleanly.
  process.on('SIGTERM', async () => {
    app.get(Logger).log('SIGTERM received — shutting down gracefully', 'Bootstrap');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    app.get(Logger).log('SIGINT received — shutting down gracefully', 'Bootstrap');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
