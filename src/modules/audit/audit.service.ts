/**
 * AuditService — Immutable Financial Audit Trail
 *
 * Every financial action writes an append-only AuditLog record.
 * Records are NEVER updated or deleted (use PostgreSQL row-level security
 * or a separate audit DB in highly regulated environments).
 */

import { Injectable, Logger } from '@nestjs/common';
import { Prisma, AuditLog } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateAuditLogDto {
  actor: string;
  action: string;
  resourceType: string;
  resourceId: string;
  transactionId?: string;
  oldState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    try {
      return await this.prisma.auditLog.create({
        data: {
          actor: dto.actor,
          action: dto.action,
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          transactionId: dto.transactionId,
          oldState: (dto.oldState as Prisma.JsonObject) ?? Prisma.JsonNull,
          newState: (dto.newState as Prisma.JsonObject) ?? Prisma.JsonNull,
          metadata: (dto.metadata as Prisma.JsonObject) ?? Prisma.JsonNull,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
        },
      });
    } catch (err) {
      // Audit logging must NEVER crash the main flow
      this.logger.error(`Failed to write audit log: ${(err as Error).message}`, { dto });
      return {} as AuditLog;
    }
  }

  async findByResource(
    resourceType: string,
    resourceId: string,
    limit = 50,
  ): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { resourceType, resourceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByTransaction(transactionId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { transactionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
