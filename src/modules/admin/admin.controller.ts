/**
 * AdminController
 *
 * All routes require JWT authentication AND the 'admin' role.
 * The role is read from the `roles` array in the JWT payload —
 * your auth service is responsible for setting it.
 *
 * Exposes a complete operational view:
 *   GET /admin/transactions              — all transactions (paginated + filterable)
 *   GET /admin/transactions/:id          — single transaction with full detail
 *   GET /admin/transactions/:id/ledger   — double-entry ledger for a transaction
 *   GET /admin/transactions/:id/audit    — audit trail for a transaction
 *   GET /admin/refunds                   — all refunds
 *   GET /admin/invoices                  — all invoices (paginated + filterable)
 *   GET /admin/subscriptions             — all subscriptions
 *   GET /admin/subscriptions/:id         — single subscription
 *   GET /admin/webhooks                  — webhook delivery log
 *   GET /admin/audit                     — global audit log
 *   GET /admin/dashboard                 — aggregate stats
 */

import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { TransactionStatus, RefundStatus, InvoiceStatus, SubscriptionStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Permission } from '../../common/rbac/permissions';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin', 'support', 'finance')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly auditService: AuditService,
  ) {}

  // ─── Dashboard ─────────────────────────────────────────────────────────

  @Get('dashboard')
  @RequirePermission(Permission.ADMIN_DASHBOARD)
  @ApiOperation({ summary: 'Aggregate stats: revenue, counts, subscription health' })
  async dashboard() {
    const [
      txTotal,
      txByStatus,
      refundTotal,
      activeSubscriptions,
      overdueSubscriptions,
      invoiceStats,
    ] = await Promise.all([
      this.prisma.transaction.count(),
      this.prisma.transaction.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { amount: true },
      }),
      this.prisma.refund.aggregate({ _sum: { amount: true }, _count: { id: true } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.PAST_DUE } }),
      this.prisma.invoice.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      transactions: {
        total: txTotal,
        byStatus: txByStatus.map((s) => ({
          status: s.status,
          count: s._count.id,
          totalAmount: s._sum.amount?.toString() ?? '0',
        })),
      },
      refunds: {
        total: refundTotal._count.id,
        totalAmount: refundTotal._sum.amount?.toString() ?? '0',
      },
      subscriptions: {
        active: activeSubscriptions,
        pastDue: overdueSubscriptions,
      },
      invoices: invoiceStats.map((s) => ({
        status: s.status,
        count: s._count.id,
        totalAmount: s._sum.totalAmount?.toString() ?? '0',
      })),
    };
  }

  // ─── Transactions ───────────────────────────────────────────────────────

  @Get('transactions')
  @RequirePermission(Permission.ADMIN_TRANSACTIONS)
  @ApiOperation({ summary: 'List all transactions across all customers' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatus })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'currency', required: false })
  async listTransactions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: TransactionStatus,
    @Query('customerId') customerId?: string,
    @Query('currency') currency?: string,
  ) {
    const where = {
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...(currency && { currency }),
    };

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { attempts: true, invoice: { select: { invoiceNumber: true, status: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  @Get('transactions/:id')
  @RequirePermission(Permission.ADMIN_TRANSACTIONS)
  @ApiOperation({ summary: 'Full transaction detail: attempts, ledger entries, refunds, audit' })
  async getTransaction(@Param('id', ParseUUIDPipe) id: string) {
    const [tx, ledger, audit] = await Promise.all([
      this.prisma.transaction.findUniqueOrThrow({
        where: { id },
        include: {
          attempts: true,
          refunds: true,
          invoice: true,
          ledgerEntries: true,
        },
      }),
      this.ledgerService.getByTransaction(id),
      this.auditService.findByTransaction(id),
    ]);

    return { ...tx, ledger, audit };
  }

  @Get('transactions/:id/ledger')
  @RequirePermission(Permission.ADMIN_LEDGER)
  @ApiOperation({ summary: 'Double-entry ledger entries for a transaction' })
  async getTransactionLedger(@Param('id', ParseUUIDPipe) id: string) {
    return this.ledgerService.getByTransaction(id);
  }

  @Get('transactions/:id/audit')
  @RequirePermission(Permission.ADMIN_AUDIT)
  @ApiOperation({ summary: 'Full audit trail for a transaction' })
  async getTransactionAudit(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditService.findByTransaction(id);
  }

  // ─── Refunds ────────────────────────────────────────────────────────────

  @Get('refunds')
  @RequirePermission(Permission.ADMIN_REFUNDS)
  @ApiOperation({ summary: 'List all refunds' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: RefundStatus })
  async listRefunds(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: RefundStatus,
  ) {
    const where = status ? { status } : {};
    const [data, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        include: { transaction: { select: { orderId: true, customerId: true, currency: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.refund.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ─── Invoices ───────────────────────────────────────────────────────────

  @Get('invoices')
  @RequirePermission(Permission.ADMIN_INVOICES)
  @ApiOperation({ summary: 'List all invoices' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
  @ApiQuery({ name: 'customerId', required: false })
  async listInvoices(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: InvoiceStatus,
    @Query('customerId') customerId?: string,
  ) {
    const where = {
      ...(status && { status }),
      ...(customerId && { customerId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { items: true, transactions: { select: { orderId: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ─── Subscriptions ──────────────────────────────────────────────────────

  @Get('subscriptions')
  @RequirePermission(Permission.ADMIN_SUBSCRIPTIONS)
  @ApiOperation({ summary: 'List all subscriptions across all customers' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: SubscriptionStatus })
  @ApiQuery({ name: 'customerId', required: false })
  async listSubscriptions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: SubscriptionStatus,
    @Query('customerId') customerId?: string,
  ) {
    const where = {
      ...(status && { status }),
      ...(customerId && { customerId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: { plan: true, cycles: { orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  @Get('subscriptions/:id')
  @RequirePermission(Permission.ADMIN_SUBSCRIPTIONS)
  @ApiOperation({ summary: 'Full subscription detail: plan, all cycles, audit' })
  async getSubscription(@Param('id', ParseUUIDPipe) id: string) {
    const [subscription, audit] = await Promise.all([
      this.prisma.subscription.findUniqueOrThrow({
        where: { id },
        include: { plan: true, cycles: { orderBy: { createdAt: 'asc' } } },
      }),
      this.auditService.findByResource('Subscription', id),
    ]);

    return { ...subscription, audit };
  }

  // ─── Webhook Logs ───────────────────────────────────────────────────────

  @Get('webhooks')
  @RequirePermission(Permission.ADMIN_WEBHOOKS)
  @ApiOperation({ summary: 'Webhook delivery log — inspect failed/unprocessed events' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'provider', required: false, enum: ['STRIPE', 'RAZORPAY'] })
  @ApiQuery({ name: 'processed', required: false, description: 'true | false' })
  async listWebhooks(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('provider') provider?: string,
    @Query('processed') processed?: string,
  ) {
    const where = {
      ...(provider && { provider: provider as any }),
      ...(processed !== undefined && { isProcessed: processed === 'true' }),
    };

    const [data, total] = await Promise.all([
      this.prisma.webhookLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        // Never return raw payload in list view — could contain sensitive event data
        select: {
          id: true,
          provider: true,
          eventType: true,
          eventId: true,
          isVerified: true,
          isProcessed: true,
          processedAt: true,
          error: true,
          createdAt: true,
        },
      }),
      this.prisma.webhookLog.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ─── Audit Log ──────────────────────────────────────────────────────────

  @Get('audit')
  @RequirePermission(Permission.ADMIN_AUDIT)
  @ApiOperation({ summary: 'Global audit log — all financial actions across all actors' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'actor', required: false, description: 'Filter by actor ID' })
  @ApiQuery({ name: 'resourceType', required: false, description: 'e.g. Transaction, Subscription' })
  @ApiQuery({ name: 'action', required: false, description: 'e.g. PAYMENT_INITIATED' })
  async listAuditLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('actor') actor?: string,
    @Query('resourceType') resourceType?: string,
    @Query('action') action?: string,
  ) {
    const where = {
      ...(actor && { actor }),
      ...(resourceType && { resourceType }),
      ...(action && { action }),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ─── Ledger ─────────────────────────────────────────────────────────────

  @Get('ledger/balance')
  @RequirePermission(Permission.ADMIN_LEDGER)
  @ApiOperation({ summary: 'Account balance — sum of all debit/credit entries per account' })
  @ApiQuery({ name: 'account', required: true, description: 'e.g. REVENUE, ACCOUNTS_RECEIVABLE' })
  @ApiQuery({ name: 'currency', required: false })
  async getAccountBalance(
    @Query('account') account: string,
    @Query('currency') currency = 'INR',
  ) {
    return this.ledgerService.getAccountBalance(account, currency);
  }
}
