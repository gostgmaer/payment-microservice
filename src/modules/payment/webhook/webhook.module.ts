import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { PaymentProviderModule } from '../provider/payment-provider.module';
import { PaymentAttemptModule } from '../attempt/payment-attempt.module';
import { AuditModule } from '../../audit/audit.module';
import { SubscriptionModule } from '../../subscription/subscription.module';

// PaymentOrchestratorModule is imported lazily via forwardRef to break
// circular dependency (Orchestrator → Webhook → Orchestrator).
import { forwardRef } from '@nestjs/common';
import { PaymentOrchestratorModule } from '../orchestrator/payment-orchestrator.module';

@Module({
  imports: [
    PaymentProviderModule,
    PaymentAttemptModule,
    AuditModule,
    SubscriptionModule,
    forwardRef(() => PaymentOrchestratorModule),
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
