import { Module } from '@nestjs/common';
import { PaymentOrchestratorService } from './payment-orchestrator.service';
import { PaymentOrchestratorController } from './payment-orchestrator.controller';
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
  controllers: [PaymentOrchestratorController],
  providers: [PaymentOrchestratorService],
  exports: [PaymentOrchestratorService],
})
export class PaymentOrchestratorModule {}
