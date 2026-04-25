import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/app-config.module';
import { IamSettingsService } from './iam-settings.service';
import { IamPermissionRegistrar } from './iam-permission-registrar.service';

@Module({
  imports: [AppConfigModule],
  providers: [IamSettingsService, IamPermissionRegistrar],
  exports: [IamSettingsService],
})
export class IamModule {}
