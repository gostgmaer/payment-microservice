/**
 * Prisma Seed — creates default Plans and a raw SQL partial unique index.
 *
 * The partial unique index enforces the business rule that only ONE successful
 * payment attempt may exist per transaction at the database level, acting as a
 * last-resort guard against race conditions.
 *
 * Run: npm run prisma:seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database…');

  // ─── Partial unique index (idempotent) ────────────────────────────────────
  // This cannot be expressed in Prisma schema DSL — must be raw SQL.
  await prisma.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS unique_success_per_transaction
      ON "PaymentAttempt" ("transactionId")
      WHERE status = 'SUCCESS';
  `;
  console.log('✅ Partial unique index ensured');

  // ─── Plans ────────────────────────────────────────────────────────────────
  const plans = [
    {
      id: 'plan_easydev_starter_inr_monthly',
      tenantId: 'easydev',
      applicationId: 'easydev-communication',
      name: 'EasyDev Starter Monthly (INR)',
      description: 'Starter recurring billing via INR providers',
      amount: BigInt(199900), // ₹1,999.00
      currency: 'INR',
      interval: 'MONTHLY' as const,
      intervalCount: 1,
      trialDays: 3,
      isActive: true,
    },
    {
      id: 'plan_easydev_growth_inr_monthly',
      tenantId: 'easydev',
      applicationId: 'easydev-communication',
      name: 'EasyDev Growth Monthly (INR)',
      description: 'Growth recurring billing via INR providers',
      amount: BigInt(499900), // ₹4,999.00
      currency: 'INR',
      interval: 'MONTHLY' as const,
      intervalCount: 1,
      trialDays: 3,
      isActive: true,
    },
    {
      id: 'plan_easydev_business_inr_monthly',
      tenantId: 'easydev',
      applicationId: 'easydev-communication',
      name: 'EasyDev Business Monthly (INR)',
      description: 'Business recurring billing via INR providers',
      amount: BigInt(1299900), // ₹12,999.00
      currency: 'INR',
      interval: 'MONTHLY' as const,
      intervalCount: 1,
      trialDays: 3,
      isActive: true,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      create: plan,
      update: {
        tenantId: plan.tenantId,
        applicationId: plan.applicationId,
        name: plan.name,
        description: plan.description,
        amount: plan.amount,
        currency: plan.currency,
        interval: plan.interval,
        intervalCount: plan.intervalCount,
        trialDays: plan.trialDays,
        isActive: plan.isActive,
      },
    });
  }

  console.log(`✅ ${plans.length} plans seeded`);
  console.log('🌱 Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
