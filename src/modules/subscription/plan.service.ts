/**
 * PlanService — CRUD for subscription plans.
 * Plans are created by admins (API key auth) and consumed by subscription logic.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Plan } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ERROR_CODES } from '../../common/constants/error-codes.constant';

export interface CreatePlanDto {
  tenantId: string;
  /** Cross-service reference to an Application in the auth/IAM service. */
  applicationId?: string;
  name: string;
  description?: string;
  amount: bigint;
  currency: string;
  interval: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  intervalCount?: number;
  trialDays?: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class PlanService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePlanDto): Promise<Plan> {
    return this.prisma.plan.create({
      data: {
        ...dto,
        intervalCount: dto.intervalCount ?? 1,
        trialDays: dto.trialDays ?? 0,
        metadata: (dto.metadata as Prisma.JsonObject) ?? Prisma.JsonNull,
      },
    });
  }

  async findAll(tenantId: string, onlyActive = true, applicationId?: string): Promise<Plan[]> {
    return this.prisma.plan.findMany({
      where: {
        tenantId,
        ...(onlyActive && { isActive: true }),
        ...(applicationId && { applicationId }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, tenantId?: string): Promise<Plan> {
    const plan = await this.prisma.plan.findFirst({
      where: { id, ...(tenantId && { tenantId }) },
    });
    if (!plan)
      throw new NotFoundException({
        message: 'Plan not found',
        errorCode: ERROR_CODES.PLAN_NOT_FOUND,
      });
    return plan;
  }

  async deactivate(id: string, tenantId: string): Promise<Plan> {
    await this.findById(id, tenantId); // ensures plan belongs to tenant
    return this.prisma.plan.update({ where: { id }, data: { isActive: false } });
  }
}
