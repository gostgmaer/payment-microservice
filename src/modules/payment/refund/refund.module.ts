import { Module } from '@nestjs/common';
import { RefundService } from './refund.service';
import { RefundController } from './refund.controller';
import { TransactionModule } from '../transaction/transaction.module';
import { PaymentAttemptModule } from '../attempt/payment-attempt.module';
import { PaymentProviderModule } from '../provider/payment-provider.module';
import { LedgerModule } from '../../ledger/ledger.module';
import { AuditModule } from '../../audit/audit.module';

@Module({
  imports: [
    TransactionModule,
    PaymentAttemptModule,
    PaymentProviderModule,
    LedgerModule,
    AuditModule,
  ],
  controllers: [RefundController],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundModule {}
