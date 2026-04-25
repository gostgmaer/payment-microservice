import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../../modules/security/strategies/jwt.strategy';

/**
 * Extracts the tenantId from the JWT-populated request.user.
 *
 * @example
 * async createInvoice(@CurrentTenant() tenantId: string) { ... }
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    return request.user?.tenantId;
  },
);
