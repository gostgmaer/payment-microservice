/**
 * BillingService
 *
 * Manages invoice lifecycle: DRAFT → ISSUED → PAID → FAILED → VOID
 *
 * Invoice must always be created BEFORE payment initiation.
 * GST calculation supports:
 *  - Intra-state: CGST + SGST (each at half the total rate)
 *  - Inter-state: IGST (full rate)
 *
 * All amounts stored as BigInt in smallest currency unit.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, Invoice, InvoiceItem, InvoiceStatus } from '@prisma/client';
import Decimal from 'decimal.js';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ERROR_CODES } from '../../common/constants/error-codes.constant';

export interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitAmount: bigint;
  /** GST type: 'intra' (CGST+SGST) or 'inter' (IGST) */
  gstType?: 'intra' | 'inter';
  /** Total GST rate percentage, e.g. 18 for 18% */
  gstRate?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateInvoiceDto {
  customerId: string;
  currency: string;
  items: InvoiceItemInput[];
  dueDate?: Date;
  metadata?: Record<string, unknown>;
  actorId: string;
}

type InvoiceWithItems = Invoice & { items: InvoiceItem[] };

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /** Create invoice in DRAFT status with GST-calculated line items. */
  async createInvoice(dto: CreateInvoiceDto): Promise<InvoiceWithItems> {
    const invoiceNumber = await this.generateInvoiceNumber();

    // ── Calculate line items + taxes ──────────────────────────────────────
    const processedItems = dto.items.map((item) => this.calculateItem(item));
    const subtotal = processedItems.reduce((sum, i) => sum + i.amount, 0n);
    const taxAmount = processedItems.reduce((sum, i) => sum + i.totalTax, 0n);
    const totalAmount = subtotal + taxAmount;

    const invoice = await this.prisma.withTransaction(async (tx: Prisma.TransactionClient) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: dto.customerId,
          currency: dto.currency,
          subtotal,
          taxAmount,
          totalAmount,
          dueDate: dto.dueDate,
          status: InvoiceStatus.DRAFT,
          metadata: (dto.metadata as Prisma.JsonObject) ?? Prisma.JsonNull,
        },
      });

      const itemData: Prisma.InvoiceItemCreateManyInput[] = processedItems.map((item) => ({
        invoiceId: inv.id,
        description: item.description,
        quantity: item.quantity,
        unitAmount: item.unitAmount,
        amount: item.amount,
        cgstRate: item.cgstRate ? new Decimal(item.cgstRate) : null,
        sgstRate: item.sgstRate ? new Decimal(item.sgstRate) : null,
        igstRate: item.igstRate ? new Decimal(item.igstRate) : null,
        cgstAmount: item.cgstAmount ?? null,
        sgstAmount: item.sgstAmount ?? null,
        igstAmount: item.igstAmount ?? null,
        metadata: (item.metadata as Prisma.JsonObject) ?? Prisma.JsonNull,
      }));

      await tx.invoiceItem.createMany({ data: itemData });
      return inv;
    });

    await this.auditService.log({
      actor: dto.actorId,
      action: 'INVOICE_CREATED',
      resourceType: 'Invoice',
      resourceId: invoice.id,
      newState: { invoiceNumber, totalAmount: totalAmount.toString(), status: InvoiceStatus.DRAFT },
    });

    this.logger.log(`Invoice ${invoiceNumber} created (total: ${totalAmount} ${dto.currency})`);

    return this.prisma.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
      include: { items: true },
    });
  }

  /** Issue a DRAFT invoice (makes it payable). */
  async issueInvoice(id: string, actorId: string): Promise<Invoice> {
    const invoice = await this.findById(id);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException({
        message: `Cannot issue invoice in ${invoice.status} status`,
        errorCode: ERROR_CODES.INVOICE_NOT_ISSUABLE,
      });
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.ISSUED },
    });

    await this.auditService.log({
      actor: actorId,
      action: 'INVOICE_ISSUED',
      resourceType: 'Invoice',
      resourceId: id,
      oldState: { status: InvoiceStatus.DRAFT },
      newState: { status: InvoiceStatus.ISSUED },
    });

    return updated;
  }

  /** Mark invoice as PAID (called after successful payment). */
  async markPaid(id: string, tx?: Prisma.TransactionClient): Promise<Invoice> {
    const client = tx ?? this.prisma;
    return client.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.PAID, paidAt: new Date() },
    });
  }

  /** Void an invoice (no further processing). */
  async voidInvoice(id: string, actorId: string): Promise<Invoice> {
    const invoice = await this.findById(id);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException({ message: 'Cannot void a paid invoice' });
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.VOID },
    });

    await this.auditService.log({
      actor: actorId,
      action: 'INVOICE_VOIDED',
      resourceType: 'Invoice',
      resourceId: id,
    });

    return updated;
  }

  async findById(id: string): Promise<InvoiceWithItems> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!invoice) throw new NotFoundException({ message: 'Invoice not found', errorCode: ERROR_CODES.INVOICE_NOT_FOUND });
    return invoice;
  }

  async findByCustomer(customerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { items: true },
      }),
      this.prisma.invoice.count({ where: { customerId } }),
    ]);
    return { data, total };
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private calculateItem(item: InvoiceItemInput) {
    const amount = BigInt(item.quantity) * item.unitAmount;

    let cgstRate: number | undefined;
    let sgstRate: number | undefined;
    let igstRate: number | undefined;
    let cgstAmount: bigint | undefined;
    let sgstAmount: bigint | undefined;
    let igstAmount: bigint | undefined;
    let totalTax = 0n;

    if (item.gstRate && item.gstRate > 0) {
      if (item.gstType === 'inter') {
        // IGST = full rate
        igstRate = item.gstRate;
        igstAmount = this.calculateTax(amount, item.gstRate);
        totalTax = igstAmount;
      } else {
        // Intra-state: CGST = SGST = half rate
        const halfRate = item.gstRate / 2;
        cgstRate = halfRate;
        sgstRate = halfRate;
        cgstAmount = this.calculateTax(amount, halfRate);
        sgstAmount = this.calculateTax(amount, halfRate);
        totalTax = cgstAmount + sgstAmount;
      }
    }

    return {
      description: item.description,
      quantity: item.quantity,
      unitAmount: item.unitAmount,
      amount,
      cgstRate,
      sgstRate,
      igstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalTax,
      metadata: item.metadata,
    };
  }

  /** Calculate tax amount for a given base and rate. Rounds to nearest unit. */
  private calculateTax(amount: bigint, ratePercent: number): bigint {
    const result = new Decimal(amount.toString())
      .mul(ratePercent)
      .div(100)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
    return BigInt(result.toString());
  }

  private async generateInvoiceNumber(): Promise<string> {
    // Format: INV-YYYYMM-XXXXXXXX (e.g. INV-202404-00000001)
    const now = new Date();
    const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await this.prisma.invoice.count();
    return `${prefix}-${String(count + 1).padStart(8, '0')}`;
  }
}
