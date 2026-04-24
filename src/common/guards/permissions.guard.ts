import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../../modules/security/strategies/jwt.strategy';
import { Permission, resolvePermissions } from '../rbac/permissions';

/**
 * PermissionsGuard — enforces fine-grained RBAC.
 *
 * Flow:
 *  1. Skip if route is @Public().
 *  2. Read @RequirePermission(...) from the route / controller.
 *  3. Resolve the user's permissions from their JWT roles via ROLE_PERMISSIONS map.
 *  4. Verify ALL required permissions are present (AND logic).
 *  5. Throw 403 with detail of what was missing if not.
 *
 * Must run AFTER JwtAuthGuard so request.user is populated.
 *
 * Register globally in SecurityModule so every route is covered automatically.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip public routes (webhooks, health)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @RequirePermission decorator — route only requires authentication
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;
    const userPermissions = resolvePermissions(user?.roles ?? []);

    const missing = requiredPermissions.filter((p) => !userPermissions.has(p));

    if (missing.length > 0) {
      throw new ForbiddenException({
        message: 'Insufficient permissions',
        missing,
        granted: [...userPermissions],
        roles: user?.roles ?? [],
      });
    }

    return true;
  }
}
