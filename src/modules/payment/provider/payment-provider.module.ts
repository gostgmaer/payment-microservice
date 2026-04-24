import { Module } from '@nestjs/common';
import { StripeProvider } from './stripe/stripe.provider';
import { RazorpayProvider } from './razorpay/razorpay.provider';
import { PaymentProviderFactory } from './payment-provider.factory';

@Module({
  providers: [StripeProvider, RazorpayProvider, PaymentProviderFactory],
  exports: [PaymentProviderFactory, StripeProvider, RazorpayProvider],
})
export class PaymentProviderModule {}
