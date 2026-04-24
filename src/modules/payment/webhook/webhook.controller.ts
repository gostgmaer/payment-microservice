/**
 * WebhookController
 *
 * Receives raw HTTP callbacks from Stripe and Razorpay.
 *
 * Critical: Uses @RawBody() to receive the unmodified Buffer so the HMAC
 * signature can be verified against the exact bytes sent by the provider.
 * Express's body parser must NOT parse these routes before signature check.
 */

import {
  Controller,
  Post,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { WebhookService } from './webhook.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Stripe webhook endpoint.
   *
   * Must be @Public() — Stripe cannot send a JWT.
   * The route is authenticated by verifying the `stripe-signature` header.
   */
  @Public()
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @ApiOperation({ summary: 'Stripe webhook receiver (signature-verified)' })
  async handleStripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    this.logger.debug(`Received Stripe webhook event`);

    if (!req.rawBody) {
      this.logger.error('rawBody not available — ensure rawBody: true in NestFactory.create()');
      return { received: false };
    }

    return this.webhookService.handleStripeWebhook(req.rawBody, signature);
  }

  /**
   * Razorpay webhook endpoint.
   * Authenticated by `x-razorpay-signature` header HMAC verification.
   */
  @Public()
  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 100 } })
  @ApiOperation({ summary: 'Razorpay webhook receiver (signature-verified)' })
  async handleRazorpay(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    this.logger.debug(`Received Razorpay webhook event`);

    if (!req.rawBody) {
      this.logger.error('rawBody not available');
      return { received: false };
    }

    return this.webhookService.handleRazorpayWebhook(req.rawBody, signature);
  }
}
