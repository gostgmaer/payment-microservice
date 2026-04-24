import { Module } from '@nestjs/common';
import { PaymentAttemptService } from './payment-attempt.service';

@Module({
  providers: [PaymentAttemptService],
  exports: [PaymentAttemptService],
})
export class PaymentAttemptModule {}
