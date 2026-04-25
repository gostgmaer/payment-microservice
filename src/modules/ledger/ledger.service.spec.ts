/**
 * LedgerService Unit Tests — Validates double-entry accounting correctness.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EntryType } from '@prisma/client';
import { LedgerService } from './ledger.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrismaService = {
  ledgerEntry: {
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('LedgerService', () => {
  let service: LedgerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LedgerService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<LedgerService>(LedgerService);
    jest.clearAllMocks();
  });

  describe('recordPayment()', () => {
    it('should create one entry when no tax is provided', async () => {
      mockPrismaService.ledgerEntry.createMany.mockResolvedValue({ count: 1 });
      mockPrismaService.ledgerEntry.findMany.mockResolvedValue([]);

      await service.recordPayment({
        tenantId: 'tenant-001',
        transactionId: 'tx-1',
        amount: BigInt(49900),
        currency: 'INR',
        description: 'Test payment',
      });

      const createManyCall = mockPrismaService.ledgerEntry.createMany.mock.calls[0][0];
      expect(createManyCall.data).toHaveLength(1);
      expect(createManyCall.data[0].type).toBe(EntryType.PAYMENT);
      expect(createManyCall.data[0].debitAccount).toBe('ACCOUNTS_RECEIVABLE');
      expect(createManyCall.data[0].creditAccount).toBe('REVENUE');
    });

    it('should create two entries when tax amount is provided', async () => {
      mockPrismaService.ledgerEntry.createMany.mockResolvedValue({ count: 2 });
      mockPrismaService.ledgerEntry.findMany.mockResolvedValue([]);

      await service.recordPayment({
        tenantId: 'tenant-001',
        transactionId: 'tx-1',
        amount: BigInt(49900),
        currency: 'INR',
        description: 'Test payment with GST',
        taxAmount: BigInt(7627), // 18% GST on 42373
      });

      const createManyCall = mockPrismaService.ledgerEntry.createMany.mock.calls[0][0];
      expect(createManyCall.data).toHaveLength(2);
      expect(createManyCall.data[0].creditAccount).toBe('REVENUE');
      expect(createManyCall.data[1].creditAccount).toBe('TAX_PAYABLE');
      expect(createManyCall.data[1].type).toBe(EntryType.TAX);
    });
  });

  describe('recordRefund()', () => {
    it('should create two refund entries (reverse accounting)', async () => {
      mockPrismaService.ledgerEntry.createMany.mockResolvedValue({ count: 2 });
      mockPrismaService.ledgerEntry.findMany.mockResolvedValue([]);

      await service.recordRefund({
        tenantId: 'tenant-001',
        transactionId: 'tx-1',
        amount: BigInt(49900),
        currency: 'INR',
        description: 'Customer refund',
      });

      const createManyCall = mockPrismaService.ledgerEntry.createMany.mock.calls[0][0];
      expect(createManyCall.data).toHaveLength(2);
      // First entry reverses REVENUE
      expect(createManyCall.data[0].debitAccount).toBe('REVENUE');
      expect(createManyCall.data[0].creditAccount).toBe('ACCOUNTS_RECEIVABLE');
      // Second entry records cash outflow
      expect(createManyCall.data[1].debitAccount).toBe('REFUND_LIABILITY');
      expect(createManyCall.data[1].creditAccount).toBe('CASH');
    });
  });
});
