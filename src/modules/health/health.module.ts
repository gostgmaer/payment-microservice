import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { BullModule } from '@nestjs/bullmq';
import { HealthController } from './health.controller';
import { QUEUE_NAMES } from '../../common/constants/queue-names.constant';

@Module({
  imports: [
    TerminusModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.PAYMENT_PROCESSING }),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
