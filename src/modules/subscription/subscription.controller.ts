import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../security/strategies/jwt.strategy';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Permission } from '../../common/rbac/permissions';
import { SubscriptionService } from './subscription.service';
import { PlanService } from './plan.service';

export class CreatePlanDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ description: 'Amount in smallest currency unit' }) @IsNumber() @Min(1) @Type(() => Number) amountRaw: number;
  @ApiProperty({ example: 'INR' }) @IsString() currency: string;
  @ApiProperty({ enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] }) @IsEnum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']) interval: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) intervalCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) trialDays?: number;
}

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'Plan ID to subscribe to' }) @IsString() planId: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) trialOverrideDays?: number;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional({ description: 'Cancel immediately or at period end' }) @IsOptional() immediate?: boolean;
}

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly planService: PlanService,
  ) {}

  // ── Plans (admin only) ──────────────────────────────────────────────────

  @Post('plans')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new subscription plan (admin)' })
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.planService.create({ ...dto, amount: BigInt(dto.amountRaw) });
  }

  @Get('plans')
  @RequirePermission(Permission.PLAN_READ)
  @ApiOperation({ summary: 'List available subscription plans' })
  async listPlans(@Query('includeInactive') includeInactive?: string) {
    return this.planService.findAll(includeInactive !== 'true');
  }

  @Get('plans/:id')
  @RequirePermission(Permission.PLAN_READ)
  @ApiOperation({ summary: 'Get plan details' })
  async getPlan(@Param('id', ParseUUIDPipe) id: string) {
    return this.planService.findById(id);
  }

  @Delete('plans/:id')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Deactivate a plan (admin)' })
  async deactivatePlan(@Param('id', ParseUUIDPipe) id: string) {
    return this.planService.deactivate(id);
  }

  // ── Subscriptions ───────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @RequirePermission(Permission.SUBSCRIPTION_WRITE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Subscribe to a plan' })
  async createSubscription(
    @Body() dto: CreateSubscriptionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.subscriptionService.createSubscription({
      customerId: user.sub,
      planId: dto.planId,
      trialOverrideDays: dto.trialOverrideDays,
      actorId: user.sub,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @RequirePermission(Permission.SUBSCRIPTION_READ)
  @ApiOperation({ summary: 'List subscriptions for current customer' })
  async listSubscriptions(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.subscriptionService.findByCustomer(user.sub, +page, +limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @RequirePermission(Permission.SUBSCRIPTION_READ)
  @ApiOperation({ summary: 'Get subscription details' })
  async getSubscription(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionService.findById(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @RequirePermission(Permission.SUBSCRIPTION_CANCEL)
  @ApiOperation({ summary: 'Cancel a subscription' })
  async cancelSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelSubscriptionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.subscriptionService.cancelSubscription({
      subscriptionId: id,
      reason: dto.reason,
      immediate: dto.immediate,
      actorId: user.sub,
    });
  }
}
