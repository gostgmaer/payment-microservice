import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Provider } from '@prisma/client';
import { ServiceOrJwtGuard } from '../../../common/guards/service-or-jwt.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { JwtPayload } from '../../security/strategies/jwt.strategy';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { Permission } from '../../../common/rbac/permissions';
import { PaymentOrchestratorService } from './payment-orchestrator.service';
import { TransactionService } from '../transaction/transaction.service';
import { PaymentProviderFactory } from '../provider/payment-provider.factory';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InitiatePaymentRequestDto {
  @ApiProperty({ example: 'order_abc123' })
  @IsString()
  orderId: string;

  @ApiProperty({
    description: 'Caller-supplied idempotency key (UUID or random string)',
    example: 'a3f8b2c1-...',
  })
  @IsString()
  idempotencyKey: string;

  @ApiProperty({ description: 'Amount in smallest currency unit (paise/cents)', example: 49900 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ example: 'INR' })
  @IsString()
  currency: string;

  @ApiPropertyOptional({ description: 'Pre-created invoice ID' })
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @ApiPropertyOptional({ enum: Provider, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(Provider, { each: true })
  providers?: Provider[];

  @ApiPropertyOptional({ example: 'upi' })
  @IsOptional()
  @IsString()
  preferredMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class VerifyPaymentRequestDto {
  @ApiProperty()
  @IsString()
  attemptId: string;

  @ApiPropertyOptional({ description: 'Razorpay payment ID from frontend' })
  @IsOptional()
  @IsString()
  providerPaymentId?: string;

  @ApiPropertyOptional({ description: 'Razorpay signature from frontend' })
  @IsOptional()
  @IsString()
  providerSignature?: string;
}

@ApiTags('Payment')
@ApiBearerAuth()
@Controller('payments')
export class PaymentOrchestratorController {
  constructor(
    private readonly orchestrator: PaymentOrchestratorService,
    private readonly transactionService: TransactionService,
    private readonly providerFactory: PaymentProviderFactory,
  ) {}

  /**
   * GET /api/v1/payments/methods
   *
   * Public endpoint — no authentication required.
   * Returns the list of payment providers that are currently enabled
   * in the payment-microservice configuration.
   *
   * The EasyDev frontend calls this via web-agency-backend-api's
   * GET /api/payments/methods proxy and uses the result to render only
   * the enabled payment options in the checkout UI.
   *
   * Response example:
   *   { methods: ['RAZORPAY', 'STRIPE'], count: 2 }
   */
  @Get('methods')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List enabled payment providers (public, no auth)' })
  @ApiResponse({
    status: 200,
    description: 'Enabled payment providers returned',
    schema: {
      example: { success: true, data: { methods: ['RAZORPAY', 'STRIPE'], count: 2 } },
    },
  })
  getEnabledMethods() {
    const providers = this.providerFactory.getAll();
    const methods = providers.map((p) => p.provider);
    return {
      success: true,
      data: { methods, count: methods.length },
    };
  }

  /**
   * Initiate a new payment.
   * Creates a transaction and returns provider-specific options.
   * Frontend uses these options to render the payment UI.
   */
  @Post('initiate')
  @UseGuards(ServiceOrJwtGuard)
  @RequirePermission(Permission.PAYMENT_WRITE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initiate a payment (creates transaction + provider options)' })
  @ApiResponse({ status: 201, description: 'Payment initiated successfully' })
  async initiatePayment(
    @Body() dto: InitiatePaymentRequestDto,
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.orchestrator.initiatePayment({
      tenantId,
      orderId: dto.orderId,
      idempotencyKey: dto.idempotencyKey,
      customerId: user.sub,
      amount: BigInt(dto.amount),
      currency: dto.currency,
      invoiceId: dto.invoiceId,
      providers: dto.providers,
      preferredMethod: dto.preferredMethod,
      metadata: dto.metadata,
      actorId: user.sub,
    });
  }

  /**
   * Verify a payment attempt (for Razorpay frontend-callback flow).
   * For Stripe, verification is handled automatically via webhooks.
   */
  @Post(':transactionId/verify')
  @UseGuards(ServiceOrJwtGuard)
  @RequirePermission(Permission.PAYMENT_WRITE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a payment attempt server-side' })
  async verifyPayment(
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Body() dto: VerifyPaymentRequestDto,
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.orchestrator.verifyPayment({
      tenantId,
      transactionId,
      attemptId: dto.attemptId,
      providerPaymentId: dto.providerPaymentId,
      providerSignature: dto.providerSignature,
      actorId: user.sub,
    });
  }

  /** Retrieve a transaction with its attempts. Scoped to current tenant. */
  @Get(':transactionId')
  @UseGuards(ServiceOrJwtGuard)
  @RequirePermission(Permission.PAYMENT_READ)
  @ApiOperation({ summary: 'Get transaction details' })
  async getTransaction(
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.transactionService.findById(transactionId, tenantId);
  }

  /** List all transactions for the authenticated customer. */
  @Get()
  @UseGuards(ServiceOrJwtGuard)
  @RequirePermission(Permission.PAYMENT_READ)
  @ApiOperation({ summary: 'List transactions for current customer' })
  async listTransactions(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.transactionService.findByCustomer(tenantId, user.sub, +page, +limit);
  }
}
