/**
 * SubscriptionService
 *
 * Manages subscription lifecycle: TRIALING → ACTIVE → PAST_DUE → CANCELLED → EXPIRED
 *
 * Renewal flow (triggered by BullMQ worker):
 *  1. Find subscriptions due for renewal.
 *  2. Create a new SubscriptionCycle.
 *  3. Create an Invoice for the cycle.
 *  4. Initiate payment via PaymentOrchestratorService.
 *  5. On success → advance currentPeriodEnd.
 *  6. On failure → increment retries, enter PAST_DUE if within grace period.
 *  7. After max retries → move to EXPIRED.
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  Prisma,
  Subscription,
  SubscriptionStatus,
  Plan,
  CycleStatus,
  PlanInterval,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { AuditService } from '../audit/audit.service';
import { AppConfigService } from '../config/app-config.service';
import { IamSettingsService } from '../iam/iam-settings.service';
import { ERROR_CODES } from '../../common/constants/error-codes.constant';
import { generateIdempotencyKey } from '../../common/utils/crypto.util';
import dayjs from 'dayjs';

export interface CreateSubscriptionDto {
  tenantId: string;
  customerId: string;
  planId: string;
  trialOverrideDays?: number;
  metadata?: Record<string, unknown>;
  actorId: string;
}

export interface CancelSubscriptionDto {
  subscriptionId: string;
  reason?: string;
  actorId: string;
  immediate?: boolean;
}

type SubscriptionWithPlan = Subscription & { plan: Plan };

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
    private readonly auditService: AuditService,
    private readonly config: AppConfigService,
    private readonly iamSettings: IamSettingsService,
  ) {}

  async createSubscription(dto: CreateSubscriptionDto): Promise<SubscriptionWithPlan> {
    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan)
      throw new NotFoundException({
        message: 'Plan not found',
        errorCode: ERROR_CODES.PLAN_NOT_FOUND,
      });
    if (!plan.isActive)
      throw new BadRequestException({
        message: 'Plan is inactive',
        errorCode: ERROR_CODES.PLAN_INACTIVE,
      });

    const trialDays = dto.trialOverrideDays ?? plan.trialDays;
    const now = new Date();
    const trialEnd = trialDays > 0 ? dayjs(now).add(trialDays, 'day').toDate() : undefined;
    const periodStart = trialEnd ?? now;
    const periodEnd = this.calculateNextPeriodEnd(periodStart, plan.interval, plan.intervalCount);

    const subscription = await this.prisma.subscription.create({
      data: {
        tenantId: dto.tenantId,
        customerId: dto.customerId,
        planId: dto.planId,
        status: trialDays > 0 ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        trialStart: trialDays > 0 ? now : undefined,
        trialEnd: trialEnd ?? undefined,
        metadata: (dto.metadata as Prisma.JsonObject) ?? Prisma.JsonNull,
      },
      include: { plan: true },
    });

    await this.auditService.log({
      tenantId: dto.tenantId,
      actor: dto.actorId,
      action: 'SUBSCRIPTION_CREATED',
      resourceType: 'Subscription',
      resourceId: subscription.id,
      newState: { planId: dto.planId, status: subscription.status },
    });

    this.logger.log(`Subscription ${subscription.id} created for customer ${dto.customerId}`);
    return subscription;
  }

  async cancelSubscription(dto: CancelSubscriptionDto): Promise<Subscription> {
    const subscription = await this.findById(dto.subscriptionId);

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException({
        message: 'Subscription is already cancelled',
        errorCode: ERROR_CODES.SUBSCRIPTION_ALREADY_CANCELLED,
      });
    }

    const updated = await this.prisma.subscription.update({
      where: { id: dto.subscriptionId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: dto.reason,
        // If not immediate, subscription remains active until end of current period
        currentPeriodEnd: dto.immediate ? new Date() : subscription.currentPeriodEnd,
      },
    });

    await this.auditService.log({
      tenantId: subscription.tenantId,
      actor: dto.actorId,
      action: 'SUBSCRIPTION_CANCELLED',
      resourceType: 'Subscription',
      resourceId: dto.subscriptionId,
      oldState: { status: subscription.status },
      newState: { status: SubscriptionStatus.CANCELLED, reason: dto.reason },
    });

    return updated;
  }

  /**
   * Process renewal for a single subscription.
   * Called by the BullMQ subscription-renewal processor.
   */
  async processRenewal(subscriptionId: string): Promise<void> {
    const subscription = await this.findById(subscriptionId);

    const renewableStatuses: SubscriptionStatus[] = [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.PAST_DUE,
      SubscriptionStatus.TRIALING,
    ];
    if (!renewableStatuses.includes(subscription.status)) {
      throw new BadRequestException({
        message: `Subscription ${subscriptionId} is not renewable (status: ${subscription.status})`,
        errorCode: ERROR_CODES.SUBSCRIPTION_NOT_RENEWABLE,
      });
    }

    const plan = await this.prisma.plan.findUniqueOrThrow({ where: { id: subscription.planId } });

    // Check if a cycle for this period already exists
    const existingCycle = await this.prisma.subscriptionCycle.findFirst({
      where: {
        subscriptionId,
        periodStart: subscription.currentPeriodStart,
        status: { not: CycleStatus.FAILED },
      },
    });

    if (existingCycle?.status === CycleStatus.PAID) {
      this.logger.log(`Subscription ${subscriptionId} already renewed for current period`);
      return;
    }

    // Create or reuse cycle
    const cycle =
      existingCycle ??
      (await this.prisma.subscriptionCycle.create({
        data: {
          subscriptionId,
          periodStart: subscription.currentPeriodStart,
          periodEnd: subscription.currentPeriodEnd,
          amount: plan.amount,
          currency: plan.currency,
          status: CycleStatus.PROCESSING,
          attemptCount: 0,
        },
      }));

    // Update attempt count
    await this.prisma.subscriptionCycle.update({
      where: { id: cycle.id },
      data: { status: CycleStatus.PROCESSING, attemptCount: { increment: 1 } },
    });

    try {
      // Create invoice for this cycle — fetch GST config from IAM settings (per-tenant)
      const gst = await this.iamSettings.getGstConfig(subscription.tenantId);
      const invoice = await this.billingService.createInvoice({
        tenantId: subscription.tenantId,
        customerId: subscription.customerId,
        currency: plan.currency,
        items: [
          {
            description: `${plan.name} — ${plan.interval} subscription`,
            quantity: 1,
            unitAmount: plan.amount,
            gstType: gst.gstType,
            gstRate: gst.gstRate,
          },
        ],
        actorId: 'subscription-renewal-worker',
      });

      await this.billingService.issueInvoice(invoice.id, 'subscription-renewal-worker');

      await this.prisma.subscriptionCycle.update({
        where: { id: cycle.id },
        data: { invoiceId: invoice.id },
      });

      // Advance subscription period on success
      const nextPeriodStart = subscription.currentPeriodEnd;
      const nextPeriodEnd = this.calculateNextPeriodEnd(
        nextPeriodStart,
        plan.interval,
        plan.intervalCount,
      );

      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: nextPeriodStart,
          currentPeriodEnd: nextPeriodEnd,
        },
      });

      await this.prisma.subscriptionCycle.update({
        where: { id: cycle.id },
        data: { status: CycleStatus.PAID },
      });

      await this.auditService.log({
        tenantId: subscription.tenantId,
        actor: 'subscription-renewal-worker',
        action: 'SUBSCRIPTION_RENEWED',
        resourceType: 'Subscription',
        resourceId: subscriptionId,
        newState: { cycleId: cycle.id, invoiceId: invoice.id, nextPeriodEnd },
      });

      this.logger.log(`Subscription ${subscriptionId} renewed successfully`);
    } catch (err) {
      const updatedCycle = await this.prisma.subscriptionCycle.update({
        where: { id: cycle.id },
        data: { status: CycleStatus.FAILED },
      });

      const gracePeriodEnd = dayjs(subscription.currentPeriodEnd)
        .add(this.config.gracePeriodDays, 'day')
        .toDate();

      const isPastGracePeriod = new Date() > gracePeriodEnd;
      const exceedsRetries = updatedCycle.attemptCount >= this.config.subscriptionMaxRetries;

      if (isPastGracePeriod || exceedsRetries) {
        await this.prisma.subscription.update({
          where: { id: subscriptionId },
          data: { status: SubscriptionStatus.EXPIRED },
        });
        this.logger.warn(`Subscription ${subscriptionId} expired after failed renewal`);
      } else {
        await this.prisma.subscription.update({
          where: { id: subscriptionId },
          data: { status: SubscriptionStatus.PAST_DUE },
        });
      }

      throw err;
    }
  }

  /** Find subscriptions due for renewal (currentPeriodEnd has passed). */
  async findDueForRenewal(): Promise<Subscription[]> {
    return this.prisma.subscription.findMany({
      where: {
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] },
        currentPeriodEnd: { lte: new Date() },
      },
    });
  }

  async findById(id: string, tenantId?: string): Promise<SubscriptionWithPlan> {
    const sub = await this.prisma.subscription.findFirst({
      where: { id, ...(tenantId && { tenantId }) },
      include: { plan: true },
    });
    if (!sub)
      throw new NotFoundException({
        message: 'Subscription not found',
        errorCode: ERROR_CODES.SUBSCRIPTION_NOT_FOUND,
      });
    return sub;
  }

  async findByCustomer(tenantId: string, customerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { tenantId, customerId };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { plan: true },
      }),
      this.prisma.subscription.count({ where }),
    ]);
    return { data, total };
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private calculateNextPeriodEnd(from: Date, interval: PlanInterval, count: number): Date {
    const d = dayjs(from);
    switch (interval) {
      case 'DAILY':
        return d.add(count, 'day').toDate();
      case 'WEEKLY':
        return d.add(count * 7, 'day').toDate();
      case 'MONTHLY':
        return d.add(count, 'month').toDate();
      case 'YEARLY':
        return d.add(count, 'year').toDate();
    }
  }
}
