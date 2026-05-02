import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AttemptStatus,
  CustomerBillingProfile,
  Prisma,
  Provider,
  TransactionStatus,
} from '@prisma/client';
import { ERROR_CODES } from '../../../common/constants/error-codes.constant';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AppConfigService } from '../../config/app-config.service';
import { StripeProvider, StripeSavedPaymentMethod } from '../provider/stripe/stripe.provider';

export interface CreateSetupIntentDto {
  tenantId: string;
  customerId: string;
  customerEmail?: string;
  provider?: Provider;
  actorId: string;
}

export interface CompleteSetupIntentDto {
  tenantId: string;
  customerId: string;
  setupIntentId: string;
  provider?: Provider;
  setAsDefault?: boolean;
  actorId: string;
}

export interface SetDefaultPaymentMethodDto {
  tenantId: string;
  customerId: string;
  paymentMethodId: string;
  provider?: Provider;
  actorId: string;
}

type JsonRecord = Record<string, unknown>;

@Injectable()
export class PaymentMethodService {
  private readonly logger = new Logger(PaymentMethodService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeProvider: StripeProvider,
    private readonly auditService: AuditService,
    private readonly config: AppConfigService,
  ) {}

  async listCustomerPaymentMethods(tenantId: string, customerId: string) {
    if (!this.config.stripeEnabled) {
      return {
        success: true,
        data: {
          items: [],
          defaultPaymentMethodId: null,
          providers: [],
          canAddPaymentMethod: false,
        },
      };
    }

    const profile = await this.resolveStripeProfile({ tenantId, customerId });
    if (!profile) {
      return {
        success: true,
        data: {
          items: [],
          defaultPaymentMethodId: null,
          providers: [Provider.STRIPE],
          canAddPaymentMethod: true,
        },
      };
    }

    const liveState = await this.stripeProvider.listSavedPaymentMethods(profile.providerCustomerId);
    await this.syncStoredDefault(profile, liveState.defaultPaymentMethodId);

    return {
      success: true,
      data: {
        items: liveState.methods,
        defaultPaymentMethodId: liveState.defaultPaymentMethodId,
        providers: [Provider.STRIPE],
        canAddPaymentMethod: true,
      },
    };
  }

  async createSetupIntent(dto: CreateSetupIntentDto) {
    const provider = this.resolveProvider(dto.provider);
    const publishableKey = this.config.stripePublishableKey;
    if (!publishableKey) {
      throw new BadRequestException({
        message: 'Stripe publishable key is not configured for payment method setup.',
        errorCode: ERROR_CODES.PAYMENT_PROVIDER_UNAVAILABLE,
      });
    }

    const profile = await this.resolveStripeProfile({
      tenantId: dto.tenantId,
      customerId: dto.customerId,
      customerEmail: dto.customerEmail,
      allowCreate: true,
    });

    const setupIntent = await this.stripeProvider.createSetupIntent({
      providerCustomerId: profile?.providerCustomerId,
      customerEmail: dto.customerEmail,
      internalCustomerId: dto.customerId,
      tenantId: dto.tenantId,
      idempotencyKey: randomUUID(),
    });

    const savedProfile = await this.upsertStripeProfile({
      tenantId: dto.tenantId,
      customerId: dto.customerId,
      providerCustomerId: setupIntent.providerCustomerId,
      defaultPaymentMethodId: profile?.defaultPaymentMethodId ?? null,
      metadata: {
        source: profile ? 'existing-profile' : 'setup-intent',
        lastSetupIntentId: setupIntent.setupIntentId,
      },
    });

    await this.auditService.log({
      tenantId: dto.tenantId,
      actor: dto.actorId,
      action: 'PAYMENT_METHOD_SETUP_INTENT_CREATED',
      resourceType: 'CustomerBillingProfile',
      resourceId: savedProfile.id,
      newState: {
        provider,
        providerCustomerId: savedProfile.providerCustomerId,
        setupIntentId: setupIntent.setupIntentId,
      },
    });

    return {
      success: true,
      data: {
        provider,
        setupIntentId: setupIntent.setupIntentId,
        clientSecret: setupIntent.clientSecret,
        providerCustomerId: savedProfile.providerCustomerId,
        publishableKey,
      },
    };
  }

  async completeSetupIntent(dto: CompleteSetupIntentDto) {
    const provider = this.resolveProvider(dto.provider);
    const completed = await this.stripeProvider.retrieveCompletedSetupIntent(dto.setupIntentId);

    const existingProfile = await this.resolveStripeProfile({
      tenantId: dto.tenantId,
      customerId: dto.customerId,
    });

    const belongsToCustomer =
      completed.metadata.internalCustomerId === dto.customerId &&
      completed.metadata.tenantId === dto.tenantId;
    const matchesExistingProfile =
      !existingProfile || existingProfile.providerCustomerId === completed.providerCustomerId;

    if (!belongsToCustomer || !matchesExistingProfile) {
      this.logger.warn(
        `Rejected SetupIntent completion for customer ${dto.customerId} in tenant ${dto.tenantId}`,
        {
          setupIntentId: dto.setupIntentId,
          metadataCustomerId: completed.metadata.internalCustomerId,
          metadataTenantId: completed.metadata.tenantId,
          providerCustomerId: completed.providerCustomerId,
          existingProviderCustomerId: existingProfile?.providerCustomerId,
        },
      );

      throw new ForbiddenException({
        message: 'The completed payment setup does not belong to this customer.',
        errorCode: ERROR_CODES.FORBIDDEN,
      });
    }

    const shouldSetDefault = dto.setAsDefault ?? !existingProfile?.defaultPaymentMethodId;

    if (shouldSetDefault) {
      await this.stripeProvider.setDefaultPaymentMethod({
        providerCustomerId: completed.providerCustomerId,
        paymentMethodId: completed.paymentMethod.id,
      });
    }

    const liveState = await this.stripeProvider.listSavedPaymentMethods(
      completed.providerCustomerId,
    );
    const savedProfile = await this.upsertStripeProfile({
      tenantId: dto.tenantId,
      customerId: dto.customerId,
      providerCustomerId: completed.providerCustomerId,
      defaultPaymentMethodId: liveState.defaultPaymentMethodId,
      metadata: {
        source: 'setup-intent-complete',
        lastSetupIntentId: dto.setupIntentId,
      },
    });

    await this.auditService.log({
      tenantId: dto.tenantId,
      actor: dto.actorId,
      action: 'PAYMENT_METHOD_ADDED',
      resourceType: 'CustomerBillingProfile',
      resourceId: savedProfile.id,
      newState: {
        provider,
        paymentMethodId: completed.paymentMethod.id,
        isDefault: Boolean(
          liveState.defaultPaymentMethodId &&
          liveState.defaultPaymentMethodId === completed.paymentMethod.id,
        ),
      },
    });

    return {
      success: true,
      data: {
        provider,
        paymentMethod: this.findPaymentMethodOrThrow(liveState.methods, completed.paymentMethod.id),
        items: liveState.methods,
        defaultPaymentMethodId: liveState.defaultPaymentMethodId,
      },
    };
  }

  async setDefaultPaymentMethod(dto: SetDefaultPaymentMethodDto) {
    const provider = this.resolveProvider(dto.provider);
    const profile = await this.resolveStripeProfile({
      tenantId: dto.tenantId,
      customerId: dto.customerId,
    });

    if (!profile) {
      throw new NotFoundException({
        message: 'No saved Stripe billing profile was found for this customer.',
        errorCode: ERROR_CODES.NOT_FOUND,
      });
    }

    const paymentMethod = await this.stripeProvider.setDefaultPaymentMethod({
      providerCustomerId: profile.providerCustomerId,
      paymentMethodId: dto.paymentMethodId,
    });

    await this.syncStoredDefault(profile, paymentMethod.id);

    await this.auditService.log({
      tenantId: dto.tenantId,
      actor: dto.actorId,
      action: 'PAYMENT_METHOD_DEFAULT_UPDATED',
      resourceType: 'CustomerBillingProfile',
      resourceId: profile.id,
      newState: {
        provider,
        paymentMethodId: paymentMethod.id,
      },
    });

    return {
      success: true,
      data: {
        provider,
        paymentMethod,
      },
    };
  }

  private resolveProvider(provider?: Provider): Provider {
    const resolved = provider ?? Provider.STRIPE;
    if (resolved !== Provider.STRIPE) {
      throw new BadRequestException({
        message: 'Saved payment method management is currently supported only for Stripe.',
        errorCode: ERROR_CODES.VALIDATION_ERROR,
      });
    }

    this.assertStripeSupported();
    return resolved;
  }

  private assertStripeSupported(): void {
    if (!this.config.stripeEnabled) {
      throw new BadRequestException({
        message: 'Stripe payment method management is not enabled.',
        errorCode: ERROR_CODES.PAYMENT_PROVIDER_UNAVAILABLE,
      });
    }
  }

  private async resolveStripeProfile(input: {
    tenantId: string;
    customerId: string;
    customerEmail?: string;
    allowCreate?: boolean;
  }): Promise<CustomerBillingProfile | null> {
    const existing = await this.prisma.customerBillingProfile.findUnique({
      where: {
        tenantId_customerId_provider: {
          tenantId: input.tenantId,
          customerId: input.customerId,
          provider: Provider.STRIPE,
        },
      },
    });

    if (existing) {
      return existing;
    }

    const discoveredProfile = await this.discoverStripeProfile(input.tenantId, input.customerId);
    if (discoveredProfile?.providerCustomerId) {
      return this.upsertStripeProfile({
        tenantId: input.tenantId,
        customerId: input.customerId,
        providerCustomerId: discoveredProfile.providerCustomerId,
        defaultPaymentMethodId: discoveredProfile.defaultPaymentMethodId ?? null,
        metadata: {
          source: discoveredProfile.source,
        },
      });
    }

    if (!input.allowCreate) {
      return null;
    }

    const providerCustomerId = await this.stripeProvider.ensureCustomer({
      customerEmail: input.customerEmail,
      internalCustomerId: input.customerId,
      tenantId: input.tenantId,
    });

    return this.upsertStripeProfile({
      tenantId: input.tenantId,
      customerId: input.customerId,
      providerCustomerId,
      defaultPaymentMethodId: null,
      metadata: {
        source: 'created',
      },
    });
  }

  private async discoverStripeProfile(
    tenantId: string,
    customerId: string,
  ): Promise<{
    providerCustomerId: string | null;
    defaultPaymentMethodId?: string | null;
    source: string;
  } | null> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { tenantId, customerId },
      select: { metadata: true },
      orderBy: { updatedAt: 'desc' },
      take: 25,
    });

    for (const subscription of subscriptions) {
      const providerCustomerId = this.extractStripeCustomerId(subscription.metadata);
      if (providerCustomerId) {
        return {
          providerCustomerId,
          defaultPaymentMethodId: this.extractDefaultPaymentMethodId(subscription.metadata),
          source: 'subscription-metadata',
        };
      }
    }

    const transactions = await this.prisma.transaction.findMany({
      where: {
        tenantId,
        customerId,
        status: TransactionStatus.SUCCESS,
      },
      select: {
        attempts: {
          where: {
            provider: Provider.STRIPE,
            status: AttemptStatus.SUCCESS,
          },
          orderBy: { updatedAt: 'desc' },
          select: { metadata: true },
          take: 5,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    for (const transaction of transactions) {
      for (const attempt of transaction.attempts) {
        const providerCustomerId = this.extractStripeCustomerId(attempt.metadata);
        if (providerCustomerId) {
          return {
            providerCustomerId,
            defaultPaymentMethodId: this.extractDefaultPaymentMethodId(attempt.metadata),
            source: 'payment-attempt-metadata',
          };
        }
      }
    }

    return null;
  }

  private async upsertStripeProfile(input: {
    tenantId: string;
    customerId: string;
    providerCustomerId: string;
    defaultPaymentMethodId?: string | null;
    metadata?: JsonRecord;
  }): Promise<CustomerBillingProfile> {
    return this.prisma.customerBillingProfile.upsert({
      where: {
        tenantId_customerId_provider: {
          tenantId: input.tenantId,
          customerId: input.customerId,
          provider: Provider.STRIPE,
        },
      },
      create: {
        tenantId: input.tenantId,
        customerId: input.customerId,
        provider: Provider.STRIPE,
        providerCustomerId: input.providerCustomerId,
        defaultPaymentMethodId: input.defaultPaymentMethodId ?? null,
        metadata: (input.metadata as Prisma.JsonObject) ?? Prisma.JsonNull,
      },
      update: {
        providerCustomerId: input.providerCustomerId,
        defaultPaymentMethodId: input.defaultPaymentMethodId ?? null,
        metadata: input.metadata
          ? ((input.metadata as Prisma.JsonObject) ?? Prisma.JsonNull)
          : undefined,
      },
    });
  }

  private async syncStoredDefault(
    profile: CustomerBillingProfile,
    defaultPaymentMethodId: string | null,
  ): Promise<void> {
    if (profile.defaultPaymentMethodId === defaultPaymentMethodId) {
      return;
    }

    await this.prisma.customerBillingProfile.update({
      where: { id: profile.id },
      data: { defaultPaymentMethodId },
    });
  }

  private findPaymentMethodOrThrow(
    paymentMethods: StripeSavedPaymentMethod[],
    paymentMethodId: string,
  ): StripeSavedPaymentMethod {
    const paymentMethod = paymentMethods.find((item) => item.id === paymentMethodId);
    if (!paymentMethod) {
      throw new NotFoundException({
        message: 'The saved payment method could not be found after setup completed.',
        errorCode: ERROR_CODES.NOT_FOUND,
      });
    }

    return paymentMethod;
  }

  private extractStripeCustomerId(metadata: Prisma.JsonValue | null): string | null {
    const value = this.asRecord(metadata);
    const providerCustomerId = value?.providerCustomerId;
    if (typeof providerCustomerId === 'string' && providerCustomerId.trim()) {
      return providerCustomerId.trim();
    }

    const legacyCustomerId = value?.customerId;
    if (typeof legacyCustomerId === 'string' && legacyCustomerId.startsWith('cus_')) {
      return legacyCustomerId;
    }

    return null;
  }

  private extractDefaultPaymentMethodId(metadata: Prisma.JsonValue | null): string | null {
    const value = this.asRecord(metadata);
    const defaultPaymentMethodId = value?.defaultPaymentMethodId;
    return typeof defaultPaymentMethodId === 'string' && defaultPaymentMethodId.trim()
      ? defaultPaymentMethodId.trim()
      : null;
  }

  private asRecord(value: Prisma.JsonValue | null): JsonRecord | null {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      return null;
    }

    return value as JsonRecord;
  }
}
