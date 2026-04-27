import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const paymentRoot = path.resolve(__dirname, '..');
const backendRoot = path.resolve(paymentRoot, '..');
const iamRoot = path.resolve(backendRoot, 'multi-tannet-auth-services');

function parseEnvFile(envPath) {
  const env = {};
  const text = fs.readFileSync(envPath, 'utf8');

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }

  return env;
}

function parsePositiveInteger(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.trunc(value));
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return 0;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function calculateNextPeriodEnd(periodStart, interval, intervalCount) {
  const next = new Date(periodStart);
  const count = Math.max(1, intervalCount || 1);

  switch (interval) {
    case 'DAILY':
      next.setDate(next.getDate() + count);
      return next;
    case 'WEEKLY':
      next.setDate(next.getDate() + (count * 7));
      return next;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + count);
      return next;
    case 'MONTHLY':
    default:
      next.setMonth(next.getMonth() + count);
      return next;
  }
}

function buildFingerprint(subscription) {
  return [
    subscription.tenantId,
    subscription.customerId,
    subscription.planId,
    new Date(subscription.currentPeriodStart).toISOString(),
    new Date(subscription.currentPeriodEnd).toISOString(),
  ].join('|');
}

async function loadPrismaClient(modulePath, datasourceUrl) {
  const moduleUrl = pathToFileURL(modulePath).href;
  const imported = await import(moduleUrl);
  return new imported.PrismaClient({ datasources: { db: { url: datasourceUrl } } });
}

async function main() {
  const apply = process.argv.includes('--apply');
  const paymentEnv = parseEnvFile(path.join(paymentRoot, '.env'));
  const iamEnv = parseEnvFile(path.join(iamRoot, '.env'));

  const paymentDatabaseUrl = paymentEnv.DATABASE_URL;
  const iamDatabaseUrl = iamEnv.DATABASE_URL;

  if (!paymentDatabaseUrl) throw new Error('Missing DATABASE_URL in payment-microservice/.env');
  if (!iamDatabaseUrl) throw new Error('Missing DATABASE_URL in multi-tannet-auth-services/.env');

  const paymentPrisma = await loadPrismaClient(
    path.join(paymentRoot, 'node_modules', '@prisma', 'client', 'index.js'),
    paymentDatabaseUrl,
  );
  const iamPrisma = await loadPrismaClient(
    path.join(iamRoot, 'node_modules', '@prisma', 'client', 'index.js'),
    iamDatabaseUrl,
  );

  try {
    const transactions = await paymentPrisma.transaction.findMany({
      where: { status: 'SUCCESS' },
      include: { attempts: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });

    const candidateTransactions = transactions.filter((transaction) => {
      const metadata = transaction?.metadata && typeof transaction.metadata === 'object' ? transaction.metadata : {};
      return (
        typeof transaction.customerId === 'string' &&
        transaction.customerId.startsWith('checkout:') &&
        typeof metadata.planId === 'string' &&
        typeof metadata.customerEmail === 'string'
      );
    });

    const emailToUser = new Map();
    for (const transaction of candidateTransactions) {
      const metadata = transaction.metadata ?? {};
      const email = String(metadata.customerEmail || '').trim().toLowerCase();
      if (!email || emailToUser.has(email)) continue;
      const user = await iamPrisma.user.findUnique({ where: { email } });
      emailToUser.set(email, user ?? null);
    }

    const existingSubscriptions = await paymentPrisma.subscription.findMany();
    const sourceTransactionIds = new Set();
    const fingerprints = new Set();

    for (const subscription of existingSubscriptions) {
      fingerprints.add(buildFingerprint(subscription));
      const metadata = subscription?.metadata && typeof subscription.metadata === 'object' ? subscription.metadata : {};
      if (typeof metadata.sourceTransactionId === 'string' && metadata.sourceTransactionId.trim()) {
        sourceTransactionIds.add(metadata.sourceTransactionId.trim());
      }
    }

    const planCache = new Map();
    const prepared = [];
    const skipped = [];

    for (const transaction of candidateTransactions) {
      const metadata = transaction.metadata ?? {};
      const email = String(metadata.customerEmail || '').trim().toLowerCase();
      const user = emailToUser.get(email) ?? null;

      if (!user) {
        skipped.push({ transactionId: transaction.id, email, reason: 'No IAM user found for email' });
        continue;
      }

      if (sourceTransactionIds.has(transaction.id)) {
        skipped.push({ transactionId: transaction.id, email, reason: 'Already backfilled by source transaction id' });
        continue;
      }

      const planId = String(metadata.planId);
      let plan = planCache.get(planId);
      if (!plan) {
        plan = await paymentPrisma.plan.findUnique({ where: { id: planId } });
        if (plan) planCache.set(planId, plan);
      }

      if (!plan) {
        skipped.push({ transactionId: transaction.id, email, reason: `Plan not found: ${planId}` });
        continue;
      }

      const transactionCreatedAt = new Date(transaction.createdAt);
      const trialDays = parsePositiveInteger(metadata.trialDays);
      const trialStart = trialDays > 0 ? transactionCreatedAt : null;
      const trialEnd = trialDays > 0 ? addDays(transactionCreatedAt, trialDays) : null;
      const currentPeriodStart = trialEnd ?? transactionCreatedAt;
      const currentPeriodEnd = calculateNextPeriodEnd(currentPeriodStart, plan.interval, plan.intervalCount);
      const now = new Date();

      let status = 'ACTIVE';
      if (trialEnd && trialEnd > now) {
        status = 'TRIALING';
      } else if (currentPeriodEnd <= now) {
        status = 'EXPIRED';
      }

      const payload = {
        tenantId: transaction.tenantId,
        customerId: user.id,
        planId,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        trialStart,
        trialEnd,
        metadata: {
          ...(typeof metadata === 'object' && metadata ? metadata : {}),
          billingMode: 'subscription',
          legacyCustomerId: transaction.customerId,
          sourceTransactionId: transaction.id,
          backfilledAt: new Date().toISOString(),
          provider: transaction.attempts[0]?.provider ?? null,
        },
      };

      const fingerprint = buildFingerprint(payload);
      if (fingerprints.has(fingerprint)) {
        skipped.push({ transactionId: transaction.id, email, reason: 'Matching subscription period already exists' });
        continue;
      }

      prepared.push({ transactionId: transaction.id, email, userId: user.id, payload });
      fingerprints.add(fingerprint);
    }

    if (!prepared.length) {
      console.log(`No subscriptions to ${apply ? 'backfill' : 'preview'}.`);
    }

    for (const item of prepared) {
      console.log(`${apply ? 'APPLY' : 'DRY-RUN'} ${item.transactionId} -> ${item.userId} (${item.email}) ${item.payload.status}`);
    }

    if (skipped.length) {
      console.log(`Skipped: ${skipped.length}`);
      for (const item of skipped) {
        console.log(`SKIP ${item.transactionId} ${item.email || 'unknown-email'} ${item.reason}`);
      }
    }

    if (apply && prepared.length) {
      for (const item of prepared) {
        await paymentPrisma.subscription.create({ data: item.payload });
      }
      console.log(`Created ${prepared.length} subscriptions.`);
    } else {
      console.log(`Prepared ${prepared.length} subscriptions.`);
      console.log('Re-run with --apply to persist changes.');
    }
  } finally {
    await paymentPrisma.$disconnect();
    await iamPrisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});