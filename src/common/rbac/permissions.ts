/**
 * RBAC Permission Definitions
 *
 * Permissions follow the pattern  resource:action
 *
 * Resources:
 *   payment       — initiate / verify / read own payments
 *   refund        — request / read refunds
 *   invoice       — create / read / void invoices
 *   subscription  — subscribe / cancel / read own subscriptions
 *   plan          — read plans (public-ish), manage plans (admin)
 *   admin         — cross-customer read access (dashboard, all records)
 *   ledger        — read ledger / accounting data
 *   webhook       — read webhook delivery logs
 *   audit         — read audit trail
 *
 * Actions:
 *   read   — GET (own resources for regular users, all for admin)
 *   write  — POST / PATCH (create / update)
 *   delete — DELETE (cancel / void / deactivate)
 *   manage — full control (write + delete + admin read)
 *
 * ── IAM integration ──────────────────────────────────────────────────────────
 * These strings are the canonical permission identifiers for this service.
 * They are used in @RequirePermission() decorators and self-registered with
 * the IAM service at startup via IamPermissionRegistrar (OnApplicationBootstrap).
 *
 * Role → permission mapping is managed entirely in the IAM service — NOT here.
 * The IAM service embeds the resolved `permissions[]` array in every JWT, and
 * PermissionsGuard reads from that array directly.
 */

export const Permission = {
  // ── Payment ────────────────────────────────────────────────────────────
  PAYMENT_READ: 'payment:read',
  PAYMENT_WRITE: 'payment:write',

  // ── Refund ─────────────────────────────────────────────────────────────
  REFUND_READ: 'refund:read',
  REFUND_WRITE: 'refund:write',

  // ── Invoice ────────────────────────────────────────────────────────────
  INVOICE_READ: 'invoice:read',
  INVOICE_WRITE: 'invoice:write',
  INVOICE_VOID: 'invoice:void',

  // ── Subscription ───────────────────────────────────────────────────────
  SUBSCRIPTION_READ: 'subscription:read',
  SUBSCRIPTION_WRITE: 'subscription:write',
  SUBSCRIPTION_CANCEL: 'subscription:cancel',

  // ── Plan ───────────────────────────────────────────────────────────────
  PLAN_READ: 'plan:read',
  PLAN_MANAGE: 'plan:manage', // create + deactivate

  // ── Admin (cross-customer) ─────────────────────────────────────────────
  ADMIN_DASHBOARD: 'admin:dashboard',
  ADMIN_TRANSACTIONS: 'admin:transactions',
  ADMIN_REFUNDS: 'admin:refunds',
  ADMIN_INVOICES: 'admin:invoices',
  ADMIN_SUBSCRIPTIONS: 'admin:subscriptions',
  ADMIN_WEBHOOKS: 'admin:webhooks',
  ADMIN_AUDIT: 'admin:audit',
  ADMIN_LEDGER: 'admin:ledger',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];