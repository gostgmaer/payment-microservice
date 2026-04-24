import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../../modules/security/strategies/jwt.strategy';

/**
 * RolesGuard — enforces role-based access control.
 *
 * Must be used AFTER JwtAuthGuard (which populates request.user).
 * If no @Roles() decorator is present the route is open to all authenticated users.
 *
 * The JWT payload's `roles` array (set by your auth service) is checked
 * against the required roles. Access is granted if at least one role matches.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('admin')
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator — any authenticated user may access
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;

    if (!user?.roles?.some((role) => requiredRoles.includes(role))) {
      throw new ForbiddenException({
        message: 'Insufficient permissions',
        required: requiredRoles,
        current: user?.roles ?? [],
      });
    }

    return true;
  }
}
