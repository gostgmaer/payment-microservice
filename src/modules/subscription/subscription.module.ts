import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { PlanService } from './plan.service';
import { BillingModule } from '../billing/billing.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [BillingModule, AuditModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, PlanService],
  exports: [SubscriptionService, PlanService],
})
export class SubscriptionModule {}
