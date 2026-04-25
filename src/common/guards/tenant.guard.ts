import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../../modules/security/strategies/jwt.strategy';

/**
 * TenantGuard — ensures every authenticated request carries a tenantId.
 *
 * Must run AFTER JwtAuthGuard so request.user is already populated.
 * Skips @Public() routes (webhooks, health).
 *
 * This guard does NOT validate that the tenantId exists in any DB — it simply
 * enforces that the JWT issued by the auth service included a tenantId claim.
 * The auth service is responsible for embedding a valid tenantId at sign time.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;

    if (!user) return true; // JwtAuthGuard will handle missing auth

    if (!user.tenantId) {
      throw new UnauthorizedException(
        'JWT is missing tenantId claim. Ensure your auth service embeds tenantId when signing tokens.',
      );
    }

    return true;
  }
}
