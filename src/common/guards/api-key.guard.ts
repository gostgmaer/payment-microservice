/**
 * API Key Guard — validates the x-api-key header for service-to-service calls.
 *
 * The API key hash is stored in env (API_KEY_HASH) — never the plaintext key.
 * Comparison uses timingSafeEqual to prevent timing attacks.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] as string | undefined;

    if (!apiKey) throw new UnauthorizedException('Missing API key');

    const storedHash = this.config.get<string>('API_KEY_HASH');
    if (!storedHash) throw new UnauthorizedException('API key not configured');

    const incomingHash = createHash('sha256').update(apiKey).digest('hex');
    const storedBuf = Buffer.from(storedHash);
    const incomingBuf = Buffer.from(incomingHash);

    if (storedBuf.length !== incomingBuf.length || !timingSafeEqual(storedBuf, incomingBuf)) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
