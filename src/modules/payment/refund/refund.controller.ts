import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../security/strategies/jwt.strategy';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { Permission } from '../../../common/rbac/permissions';
import { RefundService } from './refund.service';

export class CreateRefundDto {
  @ApiProperty({ description: 'Amount to refund in smallest currency unit', example: 9900 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ example: 'customer_request' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ description: 'Idempotency key to prevent duplicate refunds' })
  @IsString()
  idempotencyKey: string;
}

@ApiTags('Refunds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments/:transactionId/refunds')
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Post()
  @RequirePermission(Permission.REFUND_WRITE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initiate a refund for a transaction' })
  async createRefund(
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Body() dto: CreateRefundDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.refundService.createRefund({
      transactionId,
      amount: BigInt(dto.amount),
      reason: dto.reason,
      idempotencyKey: dto.idempotencyKey,
      actorId: user.sub,
    });
  }

  @Get()
  @RequirePermission(Permission.REFUND_READ)
  @ApiOperation({ summary: 'List refunds for a transaction' })
  async listRefunds(
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
  ) {
    return this.refundService.findByTransaction(transactionId);
  }
}
