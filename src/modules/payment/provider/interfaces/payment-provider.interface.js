"use strict";
/**
 * IPaymentProvider — Strategy interface for payment gateway adapters.
 *
 * All providers (Stripe, Razorpay) implement this contract. The orchestrator
 * depends only on this interface, never on concrete implementations — enabling
 * runtime failover and easy addition of future providers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
