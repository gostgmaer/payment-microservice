import { Module } from '@nestjs/common';
import { StripeProvider } from './stripe/stripe.provider';
import { RazorpayProvider } from './razorpay/razorpay.provider';
import { CashProvider } from './cash/cash.provider';
import { PaymentProviderFactory } from './payment-provider.factory';

@Module({
  providers: [StripeProvider, RazorpayProvider, CashProvider, PaymentProviderFactory],
  exports: [PaymentProviderFactory, StripeProvider, RazorpayProvider, CashProvider],
})
export class PaymentProviderModule {}
