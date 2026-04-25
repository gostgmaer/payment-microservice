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

/**
 * Role → Permission mapping.
 *
 * Roles are set by your auth service in the JWT `roles[]` field.
 * Add / remove permissions here without touching guards or controllers.
 *
 * Built-in roles:
 *   customer  — end-user: manage own payments, subscriptions, invoices
 *   support   — read-only view of all records, no writes
 *   finance   — read all + void invoices + read ledger
 *   admin     — full access to everything
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  customer: [
    Permission.PAYMENT_READ,
    Permission.PAYMENT_WRITE,
    Permission.REFUND_READ,
    Permission.REFUND_WRITE,
    Permission.INVOICE_READ,
    Permission.SUBSCRIPTION_READ,
    Permission.SUBSCRIPTION_WRITE,
    Permission.SUBSCRIPTION_CANCEL,
    Permission.PLAN_READ,
  ],

  support: [
    Permission.PAYMENT_READ,
    Permission.REFUND_READ,
    Permission.INVOICE_READ,
    Permission.SUBSCRIPTION_READ,
    Permission.PLAN_READ,
    Permission.ADMIN_TRANSACTIONS,
    Permission.ADMIN_REFUNDS,
    Permission.ADMIN_INVOICES,
    Permission.ADMIN_SUBSCRIPTIONS,
    Permission.ADMIN_WEBHOOKS,
    Permission.ADMIN_AUDIT,
  ],

  finance: [
    Permission.PAYMENT_READ,
    Permission.REFUND_READ,
    Permission.INVOICE_READ,
    Permission.INVOICE_VOID,
    Permission.SUBSCRIPTION_READ,
    Permission.PLAN_READ,
    Permission.ADMIN_TRANSACTIONS,
    Permission.ADMIN_REFUNDS,
    Permission.ADMIN_INVOICES,
    Permission.ADMIN_SUBSCRIPTIONS,
    Permission.ADMIN_AUDIT,
    Permission.ADMIN_LEDGER,
  ],

  admin: [
    // Admin has every permission
    ...Object.values(Permission),
  ],
};

/**
 * Resolve the union of all permissions granted to a user's roles.
 */
export function resolvePermissions(roles: string[]): Set<Permission> {
  const granted = new Set<Permission>();
  for (const role of roles) {
    const perms = ROLE_PERMISSIONS[role] ?? [];
    for (const p of perms) granted.add(p);
  }
  return granted;
}
