/**
 * ServiceOrJwtGuard
 *
 * Accepts either a valid service API key (x-api-key header) or a valid JWT
 * Bearer token. Intended for endpoints that must be callable from both:
 *  - Trusted internal services (e.g. web-agency-backend-api checkout adapter)
 *  - Authenticated end-users/admins via the standard JWT flow
 *
 * When API key is validated:
 *  - request.user is populated with a synthetic payload derived from
 *    x-tenant-id and x-user-id headers.
 *  - Full payment read/write permissions are granted (service account level).
 *
 * When JWT is provided:
 *  - Token is verified using the shared JWT_SECRET.
 *  - request.user is populated from the decoded payload (same shape as
 *    Passport JWT strategy produces).
 *
 * Routes decorated with @Public() bypass this guard entirely.
 */

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, timingSafeEqual } from 'crypto';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../../modules/security/strategies/jwt.strategy';

@Injectable()
export class ServiceOrJwtGuard implements CanActivate {
  /** Permissions granted to trusted service-account callers. */
  private static readonly SERVICE_PERMISSIONS = [
    'payment:read',
    'payment:write',
    'invoice:read',
    'invoice:write',
    'subscription:read',
    'subscription:write',
  ];

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Allow @Public() routes without any auth
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user: JwtPayload | undefined;
    }>();

    // ── Try API key first (service-to-service) ─────────────────────────────
    const apiKey = request.headers['x-api-key'];
    if (apiKey) {
      const storedHash = this.config.get<string>('API_KEY_HASH');
      if (!storedHash) throw new UnauthorizedException('API key not configured on this server');

      const incomingHash = createHash('sha256').update(apiKey).digest('hex');
      const storedBuf = Buffer.from(storedHash);
      const incomingBuf = Buffer.from(incomingHash);

      if (storedBuf.length === incomingBuf.length && timingSafeEqual(storedBuf, incomingBuf)) {
        // Inject synthetic user so @CurrentUser() / @CurrentTenant() work
        request.user = {
          sub: request.headers['x-user-id'] ?? 'service-account',
          tenantId: request.headers['x-tenant-id'] ?? '',
          email: request.headers['x-user-email'] ?? undefined,
          roles: ['service'],
          permissions: ServiceOrJwtGuard.SERVICE_PERMISSIONS,
        };
        return true;
      }
    }

    // ── Fall back to JWT Bearer token ──────────────────────────────────────
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authentication required: provide a valid API key or Bearer token',
      );
    }

    const token = authHeader.slice(7);
    const secret = this.config.get<string>('jwt.secret');
    if (!secret) throw new UnauthorizedException('JWT secret not configured');

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, { secret });
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
