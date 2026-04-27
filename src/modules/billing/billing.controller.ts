import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ServiceOrJwtGuard } from '../../common/guards/service-or-jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { JwtPayload } from '../security/strategies/jwt.strategy';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Permission } from '../../common/rbac/permissions';
import { BillingService, InvoiceItemInput } from './billing.service';

export class InvoiceItemDto implements InvoiceItemInput {
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsNumber() @Min(1) @Type(() => Number) quantity: number;
  @ApiProperty({ description: 'Unit price in smallest currency unit' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  unitAmountRaw: number;
  @ApiPropertyOptional({ enum: ['intra', 'inter'] })
  @IsOptional()
  @IsEnum(['intra', 'inter'])
  gstType?: 'intra' | 'inter';
  @ApiPropertyOptional({ description: 'Total GST rate %', example: 18 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  gstRate?: number;
  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, unknown>;

  get unitAmount(): bigint {
    return BigInt(this.unitAmountRaw);
  }
}

export class CreateInvoiceDto {
  @ApiProperty() @IsString() currency: string;
  @ApiProperty({ type: [InvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
  @ApiPropertyOptional() @IsOptional() dueDate?: Date;
  @ApiPropertyOptional() @IsOptional() metadata?: Record<string, unknown>;
}

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(ServiceOrJwtGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('invoices')
  @RequirePermission(Permission.INVOICE_WRITE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new invoice (DRAFT)' })
  async createInvoice(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
  ) {
    return this.billingService.createInvoice({
      tenantId,
      customerId: user.sub,
      currency: dto.currency,
      items: dto.items.map((i) => ({ ...i, unitAmount: BigInt(i.unitAmountRaw) })),
      dueDate: dto.dueDate,
      metadata: dto.metadata,
      actorId: user.sub,
    });
  }

  @Patch('invoices/:id/issue')
  @RequirePermission(Permission.INVOICE_WRITE)
  @ApiOperation({ summary: 'Issue a DRAFT invoice (makes it payable)' })
  async issueInvoice(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.billingService.issueInvoice(id, user.sub);
  }

  @Patch('invoices/:id/void')
  @RequirePermission(Permission.INVOICE_VOID)
  @ApiOperation({ summary: 'Void an invoice' })
  async voidInvoice(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.billingService.voidInvoice(id, user.sub);
  }

  @Get('invoices/:id')
  @RequirePermission(Permission.INVOICE_READ)
  @ApiOperation({ summary: 'Get invoice details' })
  async getInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.billingService.findById(id);
  }

  @Get('invoices')
  @RequirePermission(Permission.INVOICE_READ)
  @ApiOperation({ summary: 'List invoices for current customer' })
  async listInvoices(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenantId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.billingService.findByCustomer(tenantId, user.sub, +page, +limit);
  }
}
