/**
 * PaymentProviderFactory
 *
 * Resolves the correct IPaymentProvider implementation at runtime based on
 * the Provider enum value. This decouples the orchestrator from concrete
 * provider classes.
 *
 * Failover strategy:
 *  When featureFailoverEnabled is true, if the primary provider's
 *  createPayment throws, the factory falls back to the next available provider.
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Provider } from '@prisma/client';
import { IPaymentProvider } from './interfaces/payment-provider.interface';
import { StripeProvider } from './stripe/stripe.provider';
import { RazorpayProvider } from './razorpay/razorpay.provider';
import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class PaymentProviderFactory {
  private readonly logger = new Logger(PaymentProviderFactory.name);
  private readonly providerMap: Map<Provider, IPaymentProvider>;

  constructor(
    private readonly stripeProvider: StripeProvider,
    private readonly razorpayProvider: RazorpayProvider,
    private readonly config: AppConfigService,
  ) {
    this.providerMap = new Map();
    if (config.stripeEnabled)   this.providerMap.set(Provider.STRIPE, stripeProvider);
    if (config.razorpayEnabled) this.providerMap.set(Provider.RAZORPAY, razorpayProvider);
  }

  /** Get a specific provider by name. Throws if disabled. */
  get(provider: Provider): IPaymentProvider {
    const instance = this.providerMap.get(provider);
    if (!instance) {
      throw new BadRequestException(`Payment provider ${provider} is not enabled`);
    }
    return instance;
  }

  /** Returns all enabled providers in priority order. */
  getAll(): IPaymentProvider[] {
    return Array.from(this.providerMap.values());
  }

  /** Returns enabled provider names for constructing the options response. */
  getEnabledProviders(): Provider[] {
    return Array.from(this.providerMap.keys());
  }

  isEnabled(provider: Provider): boolean {
    return this.providerMap.has(provider);
  }
}
