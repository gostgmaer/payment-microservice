import { Module } from '@nestjs/common';
import { PaymentMethodController } from './payment-method.controller';
import { PaymentMethodService } from './payment-method.service';
import { PaymentProviderModule } from '../provider/payment-provider.module';
import { AuditModule } from '../../audit/audit.module';

@Module({
  imports: [PaymentProviderModule, AuditModule],
  controllers: [PaymentMethodController],
  providers: [PaymentMethodService],
  exports: [PaymentMethodService],
})
export class PaymentMethodModule {}
