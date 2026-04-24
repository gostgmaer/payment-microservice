/**
 * LedgerService — Double-Entry Accounting
 *
 * Every financial event creates two immutable ledger entries:
 *  - A DEBIT  to an asset/expense account
 *  - A CREDIT to a liability/revenue account
 *
 * This preserves the accounting equation (Assets = Liabilities + Equity)
 * and enables complete auditability and reconciliation.
 *
 * Accounts used:
 *  ACCOUNTS_RECEIVABLE  — amount owed by customers
 *  REVENUE              — earned income
 *  CASH                 — collected cash
 *  REFUND_LIABILITY     — amount owed back to customers
 *  TAX_PAYABLE          — GST/tax amounts owed to government
 *
 * Entries are NEVER updated or deleted — immutable append-only log.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Prisma, LedgerEntry, EntryType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface RecordPaymentInput {
  transactionId: string;
  amount: bigint;
  currency: string;
  description: string;
  taxAmount?: bigint;
  tx?: Prisma.TransactionClient;
}

interface RecordRefundInput {
  transactionId: string;
  amount: bigint;
  currency: string;
  description: string;
  tx?: Prisma.TransactionClient;
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a successful payment as double-entry:
   *  DR ACCOUNTS_RECEIVABLE  (asset increase — we are owed the money)
   *  CR REVENUE               (income earned)
   *
   * If tax is included, additionally:
   *  DR ACCOUNTS_RECEIVABLE  (for tax portion)
   *  CR TAX_PAYABLE           (liability — we owe this to the government)
   */
  async recordPayment(input: RecordPaymentInput): Promise<LedgerEntry[]> {
    const client = input.tx ?? this.prisma;
    const baseAmount = input.taxAmount
      ? input.amount - input.taxAmount
      : input.amount;

    const entries: Prisma.LedgerEntryCreateManyInput[] = [
      // Main payment entry
      {
        transactionId: input.transactionId,
        type: EntryType.PAYMENT,
        debitAccount: 'ACCOUNTS_RECEIVABLE',
        creditAccount: 'REVENUE',
        amount: baseAmount,
        currency: input.currency,
        description: input.description,
      },
    ];

    // Tax entry (if applicable)
    if (input.taxAmount && input.taxAmount > 0n) {
      entries.push({
        transactionId: input.transactionId,
        type: EntryType.TAX,
        debitAccount: 'ACCOUNTS_RECEIVABLE',
        creditAccount: 'TAX_PAYABLE',
        amount: input.taxAmount,
        currency: input.currency,
        description: `Tax for ${input.description}`,
      });
    }

    await client.ledgerEntry.createMany({ data: entries });

    this.logger.log(
      `Recorded ${entries.length} ledger entries for transaction ${input.transactionId}`,
    );

    return client.ledgerEntry.findMany({ where: { transactionId: input.transactionId } });
  }

  /**
   * Record a refund as double-entry (reverse of payment):
   *  DR REVENUE               (reduce earned income)
   *  CR ACCOUNTS_RECEIVABLE   (reduce amount owed)
   *
   * And when cash is returned:
   *  DR REFUND_LIABILITY      (record the obligation)
   *  CR CASH                  (cash leaving)
   */
  async recordRefund(input: RecordRefundInput): Promise<LedgerEntry[]> {
    const client = input.tx ?? this.prisma;

    const entries: Prisma.LedgerEntryCreateManyInput[] = [
      {
        transactionId: input.transactionId,
        type: EntryType.REFUND,
        debitAccount: 'REVENUE',
        creditAccount: 'ACCOUNTS_RECEIVABLE',
        amount: input.amount,
        currency: input.currency,
        description: input.description,
      },
      {
        transactionId: input.transactionId,
        type: EntryType.REFUND,
        debitAccount: 'REFUND_LIABILITY',
        creditAccount: 'CASH',
        amount: input.amount,
        currency: input.currency,
        description: `Cash refunded: ${input.description}`,
      },
    ];

    await client.ledgerEntry.createMany({ data: entries });
    this.logger.log(
      `Recorded refund ledger entries for transaction ${input.transactionId}`,
    );

    return client.ledgerEntry.findMany({
      where: { transactionId: input.transactionId, type: EntryType.REFUND },
    });
  }

  /** Get all ledger entries for a transaction. */
  async getByTransaction(transactionId: string): Promise<LedgerEntry[]> {
    return this.prisma.ledgerEntry.findMany({
      where: { transactionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Calculate the balance for an account within a date range.
   * Used for reconciliation reports.
   */
  async getAccountBalance(
    account: string,
    currency: string,
    from?: Date,
    to?: Date,
  ): Promise<{ debit: bigint; credit: bigint; net: bigint }> {
    const where: Prisma.LedgerEntryWhereInput = {
      currency,
      createdAt: { gte: from, lte: to },
      OR: [{ debitAccount: account }, { creditAccount: account }],
    };

    const entries = await this.prisma.ledgerEntry.findMany({ where });

    let debit = 0n;
    let credit = 0n;

    for (const entry of entries) {
      if (entry.debitAccount === account)  debit  += entry.amount;
      if (entry.creditAccount === account) credit += entry.amount;
    }

    return { debit, credit, net: debit - credit };
  }
}
