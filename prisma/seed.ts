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
      id: 'plan_starter_monthly',
      name: 'Starter Monthly',
      description: 'Perfect for small businesses',
      amount: BigInt(49900), // ₹499.00
      currency: 'INR',
      interval: 'MONTHLY' as const,
      intervalCount: 1,
      trialDays: 14,
      isActive: true,
    },
    {
      id: 'plan_starter_yearly',
      name: 'Starter Yearly',
      description: 'Save 20% with annual billing',
      amount: BigInt(479000), // ₹4790.00 (≈ ₹399/mo)
      currency: 'INR',
      interval: 'YEARLY' as const,
      intervalCount: 1,
      trialDays: 14,
      isActive: true,
    },
    {
      id: 'plan_pro_monthly',
      name: 'Pro Monthly',
      description: 'For growing teams',
      amount: BigInt(199900), // ₹1999.00
      currency: 'INR',
      interval: 'MONTHLY' as const,
      intervalCount: 1,
      trialDays: 7,
      isActive: true,
    },
    {
      id: 'plan_pro_yearly',
      name: 'Pro Yearly',
      description: 'Pro plan with 20% discount',
      amount: BigInt(1919000), // ₹19190.00
      currency: 'INR',
      interval: 'YEARLY' as const,
      intervalCount: 1,
      trialDays: 7,
      isActive: true,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      create: plan,
      update: { amount: plan.amount, isActive: plan.isActive },
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
