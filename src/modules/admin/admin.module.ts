import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { LedgerModule } from '../ledger/ledger.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [LedgerModule, AuditModule],
  controllers: [AdminController],
})
export class AdminModule {}
