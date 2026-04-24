/**
 * Security Module
 *
 * Provides:
 *  - JWT strategy + guard
 *  - API Key guard (for service-to-service auth)
 *  - IdempotencyService (Redis-backed key check)
 *  - Redis client (shared across the app via REDIS_CLIENT token)
 */

import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import Redis from 'ioredis';

import { AppConfigService } from '../config/app-config.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { IdempotencyService } from './services/idempotency.service';
import { REDIS_CLIENT } from '../../common/interceptors/idempotency.interceptor';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        // Verification only — no signOptions needed since this service
        // never issues tokens; that is the responsibility of your auth service.
        secret: config.jwtSecret,
      }),
    }),
  ],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    ApiKeyGuard,
    RolesGuard,
    PermissionsGuard,
    IdempotencyService,
    {
      // Shared Redis client — exported globally so BullMQ, idempotency, etc.
      // all use the same connection pool.
      provide: REDIS_CLIENT,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): Redis => {
        const client = new Redis({
          host: config.redisHost,
          port: config.redisPort,
          password: config.redisPassword,
          db: config.redisDb,
          maxRetriesPerRequest: null, // required by BullMQ
          enableReadyCheck: false,
          lazyConnect: false,
        });

        client.on('connect', () => console.log('[Redis] Connected'));
        client.on('error', (err) => console.error('[Redis] Error:', err.message));

        return client;
      },
    },
  ],
  exports: [JwtModule, JwtAuthGuard, ApiKeyGuard, RolesGuard, PermissionsGuard, IdempotencyService, REDIS_CLIENT],
})
export class SecurityModule {}
