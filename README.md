# Payment Microservice

`payment-microservice` is the billing engine for the EasyDev workspace. It owns payment initiation and verification, subscriptions, invoices, refunds, saved payment methods, webhooks, ledger entries, and payment-focused admin reporting.

## Role In The Workspace

| Consumer | How it should use this service |
|---|---|
| `web-agency-backend-api` | primary gateway for checkout, billing, invoice, and subscription flows |
| `easydev` | should reach payment features through the gateway, not directly |
| internal services | may call this service directly with `x-api-key` when they need service-to-service billing operations |
| payment providers | send webhook callbacks to the webhook endpoints |

Recommended browser path:

```text
easydev -> web-agency-backend-api -> payment-microservice
```

## Base Path And Local Port

```text
Code default port: 3000
Recommended workspace port: 3200
Base path: /api/v1
```

The service code defaults to `3000`, but in this workspace you should normally run it on `3200` to avoid collisions with the portal, IAM, and AI Communication services.

## What This Service Owns

- payment provider discovery
- payment initiation and verification
- subscriptions and plan management
- invoice creation and lifecycle
- refunds
- saved payment methods and default card handling
- Stripe and Razorpay webhook verification
- billing ledger and audit data
- admin dashboard and financial reporting

## Auth Model

There are three access patterns:

| Pattern | Used for |
|---|---|
| public | `GET /health`, `GET /payments/methods`, provider webhooks |
| `x-api-key` | trusted service-to-service routes such as plan management |
| bearer JWT | member and admin billing operations |
| service key or JWT | customer billing routes that the gateway may call on behalf of a user |

Important JWT rule:

- This service does not issue tokens.
- `JWT_SECRET` here must match the IAM service signing secret.
- JWTs must include `tenantId`, and admin flows also depend on `roles` and `permissions` claims.

Important service-key rule:

- `API_KEY_HASH` stores the SHA-256 hash of the plaintext key.
- trusted callers send the plaintext in `x-api-key`.
- for routes protected by `ServiceOrJwtGuard`, callers should also send `x-tenant-id` and usually `x-user-id` so the service can synthesize `request.user` correctly.

## Quick Start

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:migrate:dev
pnpm prisma:seed
pnpm start:dev
```

If you want the worker process too:

```bash
pnpm build
pnpm start:worker
```

## Essential Environment Variables

```env
PORT=3200
API_PREFIX=api/v1
DATABASE_URL=postgresql://payment_user:payment_pass@localhost:5432/postgres?schema=payment

JWT_SECRET=match-multi-tannet-auth-services-JWT_SECRET
API_KEY_HASH=<sha256-of-plaintext-service-key>

STRIPE_ENABLED=false
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

RAZORPAY_ENABLED=false
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

CASH_ENABLED=true
BULLMQ_ENABLED=true

IAM_SERVICE_URL=http://localhost:3100
IAM_SERVICE_API_KEY=
```

## Main Route Groups

| Prefix | Purpose |
|---|---|
| `/health` | liveness and dependency checks |
| `/payments` | provider discovery, payment initiation, verification, transaction history |
| `/payments/:transactionId/refunds` | refund creation and refund history per transaction |
| `/payment-methods` | saved cards and default payment method management |
| `/subscriptions` | plans and subscriptions |
| `/billing` | invoice creation, issue, void, and listing |
| `/admin` | tenant-scoped financial operations dashboard |
| `/webhooks` | Stripe and Razorpay callback receivers |

## Workspace Integration Notes

- EasyDev browser clients should call the gateway, not this service directly.
- `web-agency-backend-api` adapts the public checkout contract and forwards billing operations here.
- Non-production Swagger is available at `/api/v1/docs`.
- Webhook routes depend on raw request body preservation. Do not put JSON body parsing in front of them.

## Related Docs

- `docs/API.md` for the direct payment-service route contract
- `docs/INTEGRATION.md` for gateway mapping, shared secrets, and end-to-end checkout flows