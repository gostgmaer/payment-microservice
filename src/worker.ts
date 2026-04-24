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
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';

async function bootstrapWorker() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  const logger = new Logger('Worker');
  logger.log('BullMQ worker started');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received — shutting down worker');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT received — shutting down worker');
    await app.close();
    process.exit(0);
  });
}

bootstrapWorker();
