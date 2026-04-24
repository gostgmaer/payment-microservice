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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Provider } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../security/strategies/jwt.strategy';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { Permission } from '../../../common/rbac/permissions';
import { PaymentOrchestratorService } from './payment-orchestrator.service';
import { TransactionService } from '../transaction/transaction.service';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InitiatePaymentRequestDto {
  @ApiProperty({ example: 'order_abc123' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Caller-supplied idempotency key (UUID or random string)', example: 'a3f8b2c1-...' })
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
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentOrchestratorController {
  constructor(
    private readonly orchestrator: PaymentOrchestratorService,
    private readonly transactionService: TransactionService,
  ) {}

  /**
   * Initiate a new payment.
   * Creates a transaction and returns provider-specific options.
   * Frontend uses these options to render the payment UI.
   */
  @Post('initiate')
  @RequirePermission(Permission.PAYMENT_WRITE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initiate a payment (creates transaction + provider options)' })
  @ApiResponse({ status: 201, description: 'Payment initiated successfully' })
  async initiatePayment(
    @Body() dto: InitiatePaymentRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orchestrator.initiatePayment({
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
  @RequirePermission(Permission.PAYMENT_WRITE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a payment attempt server-side' })
  async verifyPayment(
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Body() dto: VerifyPaymentRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orchestrator.verifyPayment({
      transactionId,
      attemptId: dto.attemptId,
      providerPaymentId: dto.providerPaymentId,
      providerSignature: dto.providerSignature,
      actorId: user.sub,
    });
  }

  /** Retrieve a transaction with its attempts. */
  @Get(':transactionId')
  @RequirePermission(Permission.PAYMENT_READ)
  @ApiOperation({ summary: 'Get transaction details' })
  async getTransaction(
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
  ) {
    return this.transactionService.findById(transactionId);
  }

  /** List all transactions for the authenticated customer. */
  @Get()
  @RequirePermission(Permission.PAYMENT_READ)
  @ApiOperation({ summary: 'List transactions for current customer' })
  async listTransactions(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.transactionService.findByCustomer(user.sub, +page, +limit);
  }
}
