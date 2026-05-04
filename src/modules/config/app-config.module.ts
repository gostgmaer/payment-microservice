import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import configuration from './configuration';
import { AppConfigService } from './app-config.service';

/**
 * Global config module — validates required env vars at startup.
 * Joi schema prevents the app from booting with missing/invalid configuration.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'staging', 'production')
          .default('development'),
        PORT: Joi.number().default(3000),
        ENABLE_PINO_LOGGING: Joi.string().valid('true', 'false').default('false'),
        LOG_LEVEL: Joi.string().default('info'),
        DATABASE_URL: Joi.string().required(),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().default(6379),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_PUBLIC_KEY: Joi.string().allow('').optional(),
        JWT_ISSUER: Joi.string().required(),
        JWT_AUDIENCE: Joi.string().optional(),
        STRIPE_ENABLED: Joi.string().valid('true', 'false').default('false'),
        STRIPE_SECRET_KEY: Joi.when('STRIPE_ENABLED', {
          is: 'true',
          then: Joi.string().min(1).required(),
          otherwise: Joi.string().allow('').optional(),
        }),
        STRIPE_PUBLISHABLE_KEY: Joi.string().allow('').optional(),
        STRIPE_WEBHOOK_SECRET: Joi.when('STRIPE_ENABLED', {
          is: 'true',
          then: Joi.string().allow('').optional(),
          otherwise: Joi.string().allow('').optional(),
        }),
        RAZORPAY_ENABLED: Joi.string().valid('true', 'false').default('false'),
        RAZORPAY_KEY_ID: Joi.when('RAZORPAY_ENABLED', {
          is: 'true',
          then: Joi.string().min(1).required(),
          otherwise: Joi.string().allow('').optional(),
        }),
        RAZORPAY_KEY_SECRET: Joi.when('RAZORPAY_ENABLED', {
          is: 'true',
          then: Joi.string().min(1).required(),
          otherwise: Joi.string().allow('').optional(),
        }),
        RAZORPAY_WEBHOOK_SECRET: Joi.when('RAZORPAY_ENABLED', {
          is: 'true',
          then: Joi.string().allow('').optional(),
          otherwise: Joi.string().allow('').optional(),
        }),
        CASH_ENABLED: Joi.string().valid('true', 'false').default('false'),
      }),
      validationOptions: { abortEarly: false },
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
