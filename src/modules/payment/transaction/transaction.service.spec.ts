/**
 * TransactionService Unit Tests
 *
 * Tests idempotency, creation, and status transitions.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import { TransactionService } from './transaction.service';
import { PrismaService } from '../../../prisma/prisma.service';

const mockPrismaService = {
  transaction: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('TransactionService', () => {
  let service: TransactionService;

  const mockTransaction = {
    id: 'tx-uuid-1',
    orderId: 'order-001',
    idempotencyKey: 'hashed-key',
    customerId: 'customer-001',
    amount: BigInt(49900),
    currency: 'INR',
    status: TransactionStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransactionService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<TransactionService>(TransactionService);

    // Reset mocks between tests
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('should create a new transaction', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);
      mockPrismaService.transaction.create.mockResolvedValue(mockTransaction);

      const result = await service.create({
        tenantId: 'tenant-001',
        orderId: 'order-001',
        idempotencyKey: 'raw-key-123',
        customerId: 'customer-001',
        amount: BigInt(49900),
        currency: 'INR',
      });

      expect(result.id).toBe('tx-uuid-1');
      expect(result.status).toBe(TransactionStatus.PENDING);
      expect(mockPrismaService.transaction.create).toHaveBeenCalledTimes(1);
    });

    it('should return existing transaction on idempotency replay', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);

      const result = await service.create({
        tenantId: 'tenant-001',
        orderId: 'order-001',
        idempotencyKey: 'raw-key-123',
        customerId: 'customer-001',
        amount: BigInt(49900),
        currency: 'INR',
      });

      // Should return cached result without creating
      expect(result.id).toBe('tx-uuid-1');
      expect(mockPrismaService.transaction.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate orderId', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);
      const prismaError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      mockPrismaService.transaction.create.mockRejectedValue(prismaError);

      await expect(
        service.create({
          tenantId: 'tenant-001',
          orderId: 'order-001',
          idempotencyKey: 'different-key',
          customerId: 'customer-001',
          amount: BigInt(49900),
          currency: 'INR',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById()', () => {
    it('should return transaction when found', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...mockTransaction,
        attempts: [],
        invoice: null,
      });

      const result = await service.findById('tx-uuid-1');
      expect(result.id).toBe('tx-uuid-1');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);
      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus()', () => {
    it('should update transaction status', async () => {
      const updated = { ...mockTransaction, status: TransactionStatus.SUCCESS };
      mockPrismaService.transaction.update.mockResolvedValue(updated);

      const result = await service.updateStatus('tx-uuid-1', TransactionStatus.SUCCESS);
      expect(result.status).toBe(TransactionStatus.SUCCESS);
    });
  });
});
