/**
 * Worker Entrypoint
 *
 * Separate process for BullMQ workers.
 * Run with: node dist/worker
 *
 * This allows horizontal scaling of queue processors independently from the
 * HTTP API server. Workers share the same DB and Redis but have no HTTP port.
 *
 * In Kubernetes, deploy worker pods with a different Deployment (same image,
 * different CMD: ["node", "dist/worker"]).
 */

import { NestFactory } from '@nestjs/core';
import { Logger as NestLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger as PinoLogger } from 'nestjs-pino';
import { WorkerModule } from './worker.module';

async function bootstrapWorker() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const structuredLoggingEnabled = configService.get<boolean>('app.structuredLoggingEnabled', false);

  if (structuredLoggingEnabled) {
    app.useLogger(app.get(PinoLogger));
  }

  const workerLogger = structuredLoggingEnabled ? app.get(PinoLogger) : new NestLogger('Worker');

  if (structuredLoggingEnabled) {
    workerLogger.log('BullMQ worker started', 'Worker');
  } else {
    workerLogger.log('BullMQ worker started');
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    if (structuredLoggingEnabled) {
      workerLogger.log('SIGTERM received — shutting down worker', 'Worker');
    } else {
      workerLogger.log('SIGTERM received — shutting down worker');
    }
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    if (structuredLoggingEnabled) {
      workerLogger.log('SIGINT received — shutting down worker', 'Worker');
    } else {
      workerLogger.log('SIGINT received — shutting down worker');
    }
    await app.close();
    process.exit(0);
  });
}

bootstrapWorker();
