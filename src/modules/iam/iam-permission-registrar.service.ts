/**
 * IamPermissionRegistrar
 *
 * Runs once on application boot and self-registers this service's permissions
 * with the IAM service via POST /api/v1/iam/rbac/permissions/register.
 *
 * This is the standard microservice pattern described in the IAM service docs:
 *   "Microservices should call POST /api/v1/iam/rbac/permissions/register at
 *    their own startup to self-register any permissions they require."
 *
 * The call is idempotent (upsert) — it is safe to call on every boot.
 * Failures are logged as warnings and never crash the application.
 *
 * After registration an admin can assign these permissions to roles via the
 * IAM service's RBAC API. The IAM service then embeds the resolved
 * `permissions[]` array in every JWT, which PermissionsGuard reads directly.
 */

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { Permission } from '../../common/rbac/permissions';

interface PermissionEntry {
  name: string;
  description: string;
}

const PAYMENT_PERMISSIONS: PermissionEntry[] = [
  { name: Permission.PAYMENT_READ, description: 'Read own payment transactions' },
  { name: Permission.PAYMENT_WRITE, description: 'Initiate and verify payment transactions' },
  { name: Permission.REFUND_READ, description: 'Read refund records' },
  { name: Permission.REFUND_WRITE, description: 'Request and process refunds' },
  { name: Permission.INVOICE_READ, description: 'Read invoices' },
  { name: Permission.INVOICE_WRITE, description: 'Create and issue invoices' },
  { name: Permission.INVOICE_VOID, description: 'Void invoices' },
  { name: Permission.SUBSCRIPTION_READ, description: 'Read own subscriptions' },
  { name: Permission.SUBSCRIPTION_WRITE, description: 'Create subscriptions' },
  { name: Permission.SUBSCRIPTION_CANCEL, description: 'Cancel subscriptions' },
  { name: Permission.PLAN_READ, description: 'Read subscription plans' },
  { name: Permission.PLAN_MANAGE, description: 'Create and deactivate subscription plans' },
  { name: Permission.ADMIN_DASHBOARD, description: 'View payment dashboard metrics' },
  { name: Permission.ADMIN_TRANSACTIONS, description: 'Read all transactions across customers' },
  { name: Permission.ADMIN_REFUNDS, description: 'Read all refunds across customers' },
  { name: Permission.ADMIN_INVOICES, description: 'Read all invoices across customers' },
  { name: Permission.ADMIN_SUBSCRIPTIONS, description: 'Read all subscriptions across customers' },
  { name: Permission.ADMIN_WEBHOOKS, description: 'Read webhook delivery logs' },
  { name: Permission.ADMIN_AUDIT, description: 'Read the payment service audit trail' },
  { name: Permission.ADMIN_LEDGER, description: 'Read ledger / accounting entries' },
];

@Injectable()
export class IamPermissionRegistrar implements OnApplicationBootstrap {
  private readonly logger = new Logger(IamPermissionRegistrar.name);

  constructor(private readonly config: AppConfigService) {}

  async onApplicationBootstrap(): Promise<void> {
    const baseUrl = this.config.iamServiceUrl;
    if (!baseUrl) {
      this.logger.warn(
        'IAM_SERVICE_URL is not configured — skipping permission registration. ' +
          'Set IAM_SERVICE_URL in your environment to enable automatic registration.',
      );
      return;
    }

    const apiKey = this.config.iamServiceApiKey;
    if (!apiKey) {
      this.logger.warn(
        'IAM_SERVICE_API_KEY is not configured — skipping permission registration. ' +
          'Create an IAM API key with permission:manage and set IAM_SERVICE_API_KEY to enable automatic registration.',
      );
      return;
    }

    try {
      const url = `${baseUrl}/api/v1/iam/rbac/permissions/register`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      };

      const body = JSON.stringify({
        source: 'payment-microservice',
        permissions: PAYMENT_PERMISSIONS,
      });

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      });

      if (res.ok) {
        const data = (await res.json()) as { created?: number; existing?: number };
        this.logger.log(
          `Permissions registered with IAM service: ${data.created ?? 0} new, ${data.existing ?? 0} existing`,
        );
      } else {
        const text = await res.text();
        this.logger.warn(
          `IAM permission registration returned HTTP ${res.status}: ${text.slice(0, 200)}`,
        );
      }
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to register permissions with IAM service: ${(err as Error).message ?? 'unknown error'}. ` +
          'Permissions must be registered manually via the IAM RBAC API.',
      );
    }
  }
}
