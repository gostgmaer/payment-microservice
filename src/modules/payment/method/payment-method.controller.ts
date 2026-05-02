import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Provider } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ServiceOrJwtGuard } from '../../../common/guards/service-or-jwt.guard';
import { Permission } from '../../../common/rbac/permissions';
import { JwtPayload } from '../../security/strategies/jwt.strategy';
import { PaymentMethodService } from './payment-method.service';

class PaymentMethodProviderDto {
  @ApiPropertyOptional({ enum: Provider, default: Provider.STRIPE })
  @IsOptional()
  @IsEnum(Provider)
  provider?: Provider;
}

class CompletePaymentMethodSetupDto extends PaymentMethodProviderDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  setAsDefault?: boolean;
}

@ApiTags('Payment Methods')
@ApiBearerAuth()
@Controller('payment-methods')
export class PaymentMethodController {
  constructor(private readonly paymentMethodService: PaymentMethodService) {}

  @Get()
  @UseGuards(ServiceOrJwtGuard)
  @RequirePermission(Permission.PAYMENT_READ)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List saved payment methods for the authenticated customer' })
  @ApiResponse({ status: 200, description: 'Saved payment methods returned successfully' })
  async listPaymentMethods(@CurrentTenant() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.paymentMethodService.listCustomerPaymentMethods(tenantId, user.sub);
  }

  @Post('setup-intent')
  @UseGuards(ServiceOrJwtGuard)
  @RequirePermission(Permission.PAYMENT_WRITE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a SetupIntent for adding a saved payment method' })
  @ApiResponse({ status: 201, description: 'SetupIntent created successfully' })
  async createSetupIntent(
    @Body() dto: PaymentMethodProviderDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentMethodService.createSetupIntent({
      tenantId,
      customerId: user.sub,
      customerEmail: user.email,
      provider: dto.provider,
      actorId: user.sub,
    });
  }

  @Post('setup-intents/:setupIntentId/complete')
  @UseGuards(ServiceOrJwtGuard)
  @RequirePermission(Permission.PAYMENT_WRITE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a completed SetupIntent and optionally set it as default' })
  @ApiResponse({ status: 200, description: 'SetupIntent completed successfully' })
  async completeSetupIntent(
    @Param('setupIntentId') setupIntentId: string,
    @Body() dto: CompletePaymentMethodSetupDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentMethodService.completeSetupIntent({
      tenantId,
      customerId: user.sub,
      provider: dto.provider,
      setupIntentId,
      setAsDefault: dto.setAsDefault,
      actorId: user.sub,
    });
  }

  @Patch(':paymentMethodId/default')
  @UseGuards(ServiceOrJwtGuard)
  @RequirePermission(Permission.PAYMENT_WRITE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replace the customer default payment method' })
  @ApiResponse({ status: 200, description: 'Default payment method updated successfully' })
  async setDefaultPaymentMethod(
    @Param('paymentMethodId') paymentMethodId: string,
    @Body() dto: PaymentMethodProviderDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentMethodService.setDefaultPaymentMethod({
      tenantId,
      customerId: user.sub,
      paymentMethodId,
      provider: dto.provider,
      actorId: user.sub,
    });
  }
}
