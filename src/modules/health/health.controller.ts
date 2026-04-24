/**
 * Health Module
 *
 * Exposes GET /api/v1/health for liveness/readiness probes.
 * Checks:
 *  - PostgreSQL (Prisma ping)
 *  - Redis (PING command)
 *
 * Used by Docker HEALTHCHECK, Kubernetes probes, and load balancers.
 */

import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  HealthCheckResult,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../../common/constants/queue-names.constant';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.PAYMENT_PROCESSING) private readonly paymentQueue: Queue,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check (DB + Redis)' })
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      // PostgreSQL
      () => this.prismaIndicator.pingCheck('database', this.prisma),

      // Redis (via BullMQ queue client)
      async (): Promise<HealthIndicatorResult> => {
        try {
          const client = await this.paymentQueue.client;
          await client.ping();
          return { redis: { status: 'up' } };
        } catch {
          return { redis: { status: 'down' } };
        }
      },
    ]);
  }
}
