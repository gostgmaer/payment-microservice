# Payment Service Integration Guide

This guide explains how `payment-microservice` fits into the current EasyDev workspace and how to integrate with it without route, secret, or auth mismatches.

## Recommended Topology

### Browser clients

Use the gateway:

```text
easydev -> web-agency-backend-api -> payment-microservice
```

Why:

- the gateway preserves the frontend contract already used by EasyDev
- checkout verification can trigger downstream product provisioning
- service keys stay server-side
- payment-service response differences are normalized before they reach the browser

### Trusted backend services

Call `payment-microservice` directly only when you control server-side secrets and need service-to-service access.

## Recommended Local Port Map

| Service | Port |
|---|---|
| EasyDev portal | `3000` |
| AI Communication backend | `3001` |
| AI Communication frontend | `3002` |
| IAM | `3100` |
| payment-microservice | `3200` |
| gateway | `3500` |

## Shared Secret Contract

| Service | Variable | Must match |
|---|---|---|
| payment-microservice | `JWT_SECRET` | IAM `JWT_SECRET` |
| payment-microservice | `API_KEY_HASH` | hash of gateway plaintext payment API key |
| gateway | `PAYMENT_SERVICE_URL` | payment service host and port |
| gateway | `PAYMENT_SERVICE_API_KEY` or configured payment API key | plaintext that hashes to `API_KEY_HASH` |

What breaks if these drift:

- bearer auth fails when `JWT_SECRET` differs from IAM
- service-to-service checkout, subscription, or billing calls fail with `401` when the API key pair does not match
- browser checkout fails indirectly when the gateway points at the wrong payment service URL

## Gateway Mapping

The EasyDev stack uses the gateway as the public contract.

Common browser-facing routes:

| Gateway route | Payment service route |
|---|---|
| `GET /api/payments/methods` | `GET /api/v1/payments/methods` |
| `POST /api/payments/initiate` | `POST /api/v1/payments/initiate` |
| `POST /api/payments/verify` | `POST /api/v1/payments/:transactionId/verify` |
| `GET /api/payments/subscriptions` | `GET /api/v1/subscriptions` with fallback to `/api/v1/payments` |
| `GET /api/payments/invoices` | `GET /api/v1/billing/invoices` |
| `GET /api/payments/payment-methods` | `GET /api/v1/payment-methods` |
| `POST /api/payments/payment-methods/setup-intent` | `POST /api/v1/payment-methods/setup-intent` |
| `POST /api/payments/payment-methods/setup-intents/:id/complete` | `POST /api/v1/payment-methods/setup-intents/:id/complete` |
| `PATCH /api/payments/payment-methods/:id/default` | `PATCH /api/v1/payment-methods/:id/default` |
| `PATCH /api/payments/subscriptions/:id/plan` | `PATCH /api/v1/subscriptions/:id/plan` |
| `DELETE /api/payments/subscriptions/:id` | `DELETE /api/v1/subscriptions/:id` |
| `GET /api/payments/admin/*` | `GET /api/v1/admin/*` |

The gateway also adapts webhook ingress and post-payment provisioning.

## Direct Service-To-Service Headers

For `ApiKeyGuard` routes:

```http
x-api-key: <plaintext-shared-key>
```

For `ServiceOrJwtGuard` routes called by a trusted backend, send:

```http
x-api-key: <plaintext-shared-key>
x-tenant-id: easydev
x-user-id: <customer-or-actor-id>
x-user-email: user@example.com
Content-Type: application/json
```

Why `x-user-id` matters:

- the guard synthesizes `request.user.sub` from that header
- many controllers call `@CurrentUser()` and pass `user.sub` to services
- omitting it can cause service-account calls to be recorded under a generic fallback id

## Direct JWT Integration

Use bearer JWTs for:

- member billing pages
- admin reporting
- refunds
- subscription create flows initiated by authenticated users

JWT requirements:

- signed by IAM using the shared secret
- includes `tenantId`
- includes `permissions[]` for permission-checked routes
- admin routes also require `roles[]` containing `admin`, `support`, or `finance`

## Public Checkout Flow In This Workspace

The current EasyDev purchase path is:

1. frontend calls `GET /api/payments/methods` on the gateway
2. frontend calls `POST /api/payments/initiate` on the gateway
3. gateway calls `POST /api/v1/payments/initiate` on this service with `x-api-key`
4. frontend completes provider-specific checkout
5. frontend calls `POST /api/payments/verify` on the gateway
6. gateway calls `POST /api/v1/payments/:transactionId/verify` on this service
7. after verify succeeds, the gateway continues product provisioning for purchased apps

Important consequence:

- browser clients should not call `POST /api/v1/payments/initiate` or `POST /api/v1/payments/:transactionId/verify` directly in the EasyDev stack

## Member Billing Flow

For authenticated members, the gateway forwards billing requests to this service and preserves the user context.

Typical member operations:

1. list subscriptions
2. list invoices
3. list payment methods
4. create and complete a SetupIntent
5. replace the default payment method
6. change or cancel a subscription

The payment service supports these directly, but the gateway is the stable browser contract.

## Plan And Subscription Management

Two separate flows exist:

### Service-managed plans

Use `x-api-key` to create or deactivate plans:

- `POST /api/v1/subscriptions/plans`
- `DELETE /api/v1/subscriptions/plans/:id?tenantId=...`

This is intended for trusted backend administration, not the browser.

### User subscriptions

Use JWT or service-or-JWT routes for:

- `POST /api/v1/subscriptions`
- `GET /api/v1/subscriptions`
- `PATCH /api/v1/subscriptions/:id/plan`
- `DELETE /api/v1/subscriptions/:id`

## Webhooks

Direct payment-service webhook endpoints:

- `POST /api/v1/webhooks/stripe`
- `POST /api/v1/webhooks/razorpay`

Key requirements:

- preserve raw request body
- send provider signature header unchanged
- do not put JSON body mutation ahead of signature verification

In the EasyDev stack, the gateway also exposes webhook adapter routes. If the gateway is the public ingress, configure providers to hit the gateway route that forwards the raw payload correctly.

## IAM Integration

This service also talks to IAM for platform settings and permission self-registration.

Relevant env vars:

```env
IAM_SERVICE_URL=http://localhost:4002
IAM_SERVICE_API_KEY=
```

What IAM contributes here:

- signing secret source for JWT verification
- roles and permissions embedded into JWTs
- optional platform settings fetches and permission registration support

## Local Setup Checklist

1. Set `PORT=3200`.
2. Set `API_PREFIX=api/v1`.
3. Set `DATABASE_URL` to a running PostgreSQL instance.
4. Set `JWT_SECRET` to the exact IAM signing secret.
5. Generate a plaintext payment API key and store only its SHA-256 hash in `API_KEY_HASH`.
6. Enable Stripe, Razorpay, or cash as needed.
7. Run Prisma generate and migrations.
8. Start the service.
9. Confirm `GET /api/v1/health` is healthy.
10. Confirm the gateway can reach `GET /api/v1/payments/methods`.

## Common Integration Failures

### `401 Invalid API key` on gateway checkout calls

Usually caused by:

- wrong plaintext key in the gateway
- wrong `API_KEY_HASH` in payment service
- hashing the hash instead of hashing the plaintext once

### `401 Invalid or expired token` on member billing routes

Usually caused by:

- `JWT_SECRET` mismatch with IAM
- missing `tenantId` claim
- missing required permissions in older tokens

### Customer list routes return wrong or empty data in service mode

Usually caused by:

- missing `x-user-id`
- wrong `x-tenant-id`
- calling a direct service route that expects a real customer context but sending only a bare service key

### Webhooks fail signature verification

Usually caused by:

- body parsing changed the raw bytes
- wrong Stripe or Razorpay webhook secret
- provider pointed at the wrong URL

### Public Razorpay recurring checkout does not complete

Current workspace caveat:

- the gateway public checkout flow uses recurring subscription semantics for Razorpay
- if the Razorpay account does not have subscriptions or plan creation enabled, recurring checkout will fail even though standard order creation works