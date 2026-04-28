# Payment Service API

This document describes the direct API surface of `payment-microservice`.

## Base URL

```text
Recommended local URL: http://localhost:3200/api/v1
Code default port: 3000
Recommended workspace port: 3200
```

## Response Shape

Do not assume a single universal envelope.

- some routes return `{ success, data }`
- many domain routes return raw service objects directly
- gateway routes in `web-agency-backend-api` often normalize or wrap these responses for browser clients

If you are writing a browser client, prefer the gateway contract instead of binding directly to this service.

## Auth Matrix

| Access type | Routes |
|---|---|
| public | `GET /health`, `GET /payments/methods`, `POST /webhooks/stripe`, `POST /webhooks/razorpay` |
| `x-api-key` only | `POST /subscriptions/plans`, `DELETE /subscriptions/plans/:id` |
| JWT only | `POST /subscriptions`, `POST /payments/:transactionId/refunds`, `GET /payments/:transactionId/refunds`, all `/admin/*` |
| service key or JWT | `/payments/initiate`, `/payments/:transactionId/verify`, `/payments`, `/payments/:transactionId`, `/payment-methods/*`, `/billing/*`, `GET /subscriptions`, `GET /subscriptions/:id`, `PATCH /subscriptions/:id/plan`, `DELETE /subscriptions/:id` |

### JWT expectations

The bearer token is verified with `JWT_SECRET` and should come from the shared IAM service. The token must include:

- `sub`
- `tenantId`
- `email` when customer email is needed
- `roles` and `permissions` for admin flows

### Service-key expectations

When using `x-api-key` on `ServiceOrJwtGuard` routes, send:

- `x-api-key`: plaintext service key
- `x-tenant-id`: current tenant
- `x-user-id`: customer or actor id
- `x-user-email`: optional but useful for billing-customer creation flows

The service hashes `x-api-key`, compares it to `API_KEY_HASH`, and injects a synthetic `request.user` so `@CurrentUser()` and `@CurrentTenant()` keep working.

## Public Routes

### `GET /health`

Checks:

- PostgreSQL via Prisma
- Redis via BullMQ queue client

### `GET /payments/methods`

Returns enabled providers.

Example response:

```json
{
  "success": true,
  "data": {
    "methods": ["RAZORPAY", "STRIPE"],
    "count": 2
  }
}
```

### `POST /webhooks/stripe`

Public route authenticated by Stripe signature verification.

Required header:

- `stripe-signature`

### `POST /webhooks/razorpay`

Public route authenticated by Razorpay signature verification.

Required header:

- `x-razorpay-signature`

## Payments

### `POST /payments/initiate`

Creates a transaction and provider-specific options.

Request body:

```json
{
  "orderId": "order_abc123",
  "idempotencyKey": "a3f8b2c1-...",
  "amount": 499900,
  "currency": "INR",
  "invoiceId": "optional-invoice-id",
  "providers": ["RAZORPAY"],
  "preferredMethod": "upi",
  "metadata": {
    "billingMode": "subscription"
  }
}
```

Notes:

- amount is in the smallest currency unit
- trusted internal callers may authenticate with `x-api-key`
- browser-facing checkout should usually use the gateway adapter instead

### `POST /payments/:transactionId/verify`

Verifies a payment attempt. Required for provider flows such as Razorpay frontend callbacks.

Request body:

```json
{
  "attemptId": "attempt-id",
  "providerPaymentId": "pay_123",
  "providerSignature": "signature_if_required"
}
```

### `GET /payments/:transactionId`

Returns a tenant-scoped transaction with its attempts.

### `GET /payments`

Lists transactions for the authenticated customer.

Query params:

- `page`
- `limit`

## Refunds

### `POST /payments/:transactionId/refunds`

JWT-only route.

Request body:

```json
{
  "amount": 9900,
  "reason": "customer_request",
  "idempotencyKey": "refund-idempotency-key"
}
```

### `GET /payments/:transactionId/refunds`

JWT-only route that lists refunds for a transaction.

## Payment Methods

### `GET /payment-methods`

Lists saved payment methods for the authenticated customer.

Important implementation note:

- when Stripe is disabled, the service returns an empty, non-failing payload so billing UI can degrade gracefully

### `POST /payment-methods/setup-intent`

Creates a SetupIntent for adding a saved method.

Request body:

```json
{
  "provider": "STRIPE"
}
```

### `POST /payment-methods/setup-intents/:setupIntentId/complete`

Completes SetupIntent verification and can mark the method as default.

Request body:

```json
{
  "provider": "STRIPE",
  "setAsDefault": true
}
```

### `PATCH /payment-methods/:paymentMethodId/default`

Replaces the customer's default saved method.

## Subscriptions And Plans

### Plans

| Method | Path | Auth |
|---|---|---|
| `POST` | `/subscriptions/plans` | `x-api-key` |
| `GET` | `/subscriptions/plans` | permissioned request |
| `GET` | `/subscriptions/plans/:id` | permissioned request |
| `DELETE` | `/subscriptions/plans/:id?tenantId=...` | `x-api-key` |

Plan creation body:

```json
{
  "tenantId": "easydev",
  "applicationId": "optional-iam-application-id",
  "name": "Growth",
  "description": "Monthly growth plan",
  "amountRaw": 499900,
  "currency": "INR",
  "interval": "MONTHLY",
  "intervalCount": 1,
  "trialDays": 3
}
```

### Subscriptions

| Method | Path |
|---|---|
| `POST` | `/subscriptions` |
| `GET` | `/subscriptions` |
| `GET` | `/subscriptions/:id` |
| `PATCH` | `/subscriptions/:id/plan` |
| `DELETE` | `/subscriptions/:id` |

Create subscription body:

```json
{
  "planId": "plan-id",
  "trialOverrideDays": 3
}
```

Change-plan body:

```json
{
  "planId": "new-plan-id"
}
```

Cancel body:

```json
{
  "reason": "customer_request",
  "immediate": false
}
```

## Billing And Invoices

All `/billing/*` routes use `ServiceOrJwtGuard` and permission checks.

| Method | Path |
|---|---|
| `POST` | `/billing/invoices` |
| `PATCH` | `/billing/invoices/:id/issue` |
| `PATCH` | `/billing/invoices/:id/void` |
| `GET` | `/billing/invoices/:id` |
| `GET` | `/billing/invoices` |

Create invoice body:

```json
{
  "currency": "INR",
  "items": [
    {
      "description": "EasyDev Growth Plan",
      "quantity": 1,
      "unitAmountRaw": 499900,
      "gstType": "intra",
      "gstRate": 18
    }
  ],
  "metadata": {
    "productId": "easydev-communication"
  }
}
```

## Admin Routes

All admin routes require:

- valid JWT
- role in `admin`, `support`, or `finance`
- required `permissions[]` claim from IAM

Admin surface:

| Method | Path |
|---|---|
| `GET` | `/admin/dashboard` |
| `GET` | `/admin/transactions` |
| `GET` | `/admin/transactions/:id` |
| `GET` | `/admin/transactions/:id/ledger` |
| `GET` | `/admin/transactions/:id/audit` |
| `GET` | `/admin/refunds` |
| `GET` | `/admin/invoices` |
| `GET` | `/admin/subscriptions` |
| `GET` | `/admin/subscriptions/:id` |
| `GET` | `/admin/webhooks` |
| `GET` | `/admin/audit` |
| `GET` | `/admin/ledger/balance` |

Common query support includes `page`, `limit`, and status filters.

## Notes That Matter In Practice

- webhook endpoints require the exact raw bytes for signature verification
- payment initiation and refunds are idempotency-sensitive; callers should always send stable idempotency keys
- trusted service-key calls should include `x-user-id` when the controller uses `@CurrentUser()`
- plan management is intentionally not a browser-facing flow in the EasyDev stack