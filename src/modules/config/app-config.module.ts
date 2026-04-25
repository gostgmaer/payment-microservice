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
        DATABASE_URL: Joi.string().required(),
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        JWT_SECRET: Joi.string().min(32).required(),
        STRIPE_SECRET_KEY: Joi.string().when('STRIPE_ENABLED', {
          is: 'true',
          then: Joi.required(),
        }),
        STRIPE_WEBHOOK_SECRET: Joi.string().when('STRIPE_ENABLED', {
          is: 'true',
          then: Joi.required(),
        }),
        RAZORPAY_KEY_ID: Joi.string().when('RAZORPAY_ENABLED', {
          is: 'true',
          then: Joi.required(),
        }),
        RAZORPAY_KEY_SECRET: Joi.string().when('RAZORPAY_ENABLED', {
          is: 'true',
          then: Joi.required(),
        }),
        RAZORPAY_WEBHOOK_SECRET: Joi.string().when('RAZORPAY_ENABLED', {
          is: 'true',
          then: Joi.required(),
        }),
      }),
      validationOptions: { abortEarly: false },
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
