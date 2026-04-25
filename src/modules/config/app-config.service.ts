/**
 * AppConfigService — typed accessor for all configuration values.
 *
 * Centralises config access so feature modules never call ConfigService
 * directly with magic strings.
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  // ── App ──────────────────────────────────────────────────────────────────
  get port(): number {
    return this.config.get<number>('app.port', 3000);
  }
  get env(): string {
    return this.config.get<string>('app.env', 'development');
  }
  get isProduction(): boolean {
    return this.env === 'production';
  }
  get logLevel(): string {
    return this.config.get<string>('app.logLevel', 'info');
  }

  // ── Redis ────────────────────────────────────────────────────────────────
  get redisHost(): string {
    return this.config.get<string>('redis.host', 'localhost');
  }
  get redisPort(): number {
    return this.config.get<number>('redis.port', 6379);
  }
  get redisPassword(): string | undefined {
    return this.config.get<string | undefined>('redis.password');
  }
  get redisDb(): number {
    return this.config.get<number>('redis.db', 0);
  }

  // ── JWT ──────────────────────────────────────────────────────────────────
  // This service only VERIFIES tokens — it never issues them.
  // JWT_SECRET must match the signing secret of your external auth service.
  get jwtSecret(): string {
    return this.config.getOrThrow<string>('jwt.secret');
  }

  // ── Stripe ───────────────────────────────────────────────────────────────
  get stripeSecretKey(): string {
    return this.config.getOrThrow<string>('stripe.secretKey');
  }
  get stripeWebhookSecret(): string {
    return this.config.getOrThrow<string>('stripe.webhookSecret');
  }
  get stripeApiVersion(): string {
    return this.config.get('stripe.apiVersion', '2024-04-10');
  }
  get stripeEnabled(): boolean {
    return this.config.get<boolean>('stripe.enabled', true);
  }

  // ── Razorpay ─────────────────────────────────────────────────────────────
  get razorpayKeyId(): string {
    return this.config.getOrThrow<string>('razorpay.keyId');
  }
  get razorpayKeySecret(): string {
    return this.config.getOrThrow<string>('razorpay.keySecret');
  }
  get razorpayWebhookSecret(): string {
    return this.config.getOrThrow<string>('razorpay.webhookSecret');
  }
  get razorpayEnabled(): boolean {
    return this.config.get<boolean>('razorpay.enabled', true);
  }

  // ── Payment ──────────────────────────────────────────────────────────────
  get attemptExpiryMinutes(): number {
    return this.config.get<number>('payment.attemptExpiryMinutes', 15);
  }
  get maxRetryAttempts(): number {
    return this.config.get<number>('payment.maxRetryAttempts', 3);
  }
  get idempotencyTtlSeconds(): number {
    return this.config.get<number>('payment.idempotencyTtlSeconds', 86400);
  }

  // ── Subscription ─────────────────────────────────────────────────────────
  get gracePeriodDays(): number {
    return this.config.get<number>('subscription.gracePeriodDays', 3);
  }
  get subscriptionMaxRetries(): number {
    return this.config.get<number>('subscription.maxRetryAttempts', 3);
  }

  // ── Queue concurrency ────────────────────────────────────────────────────
  get paymentQueueConcurrency(): number {
    return this.config.get<number>('queues.paymentConcurrency', 5);
  }
  get refundQueueConcurrency(): number {
    return this.config.get<number>('queues.refundConcurrency', 3);
  }
  get subscriptionQueueConcurrency(): number {
    return this.config.get<number>('queues.subscriptionConcurrency', 5);
  }

  // ── Feature flags ────────────────────────────────────────────────────────
  get featureFailoverEnabled(): boolean {
    return this.config.get<boolean>('features.failoverEnabled', true);
  }
  get featureReconciliationEnabled(): boolean {
    return this.config.get<boolean>('features.reconciliationEnabled', true);
  }
  get reconciliationCron(): string {
    return this.config.get<string>('features.reconciliationCron', '0 2 * * *');
  }
}
