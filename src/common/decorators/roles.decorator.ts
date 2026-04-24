import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Attach required roles to a route or controller.
 * Works in combination with RolesGuard.
 *
 * Usage:
 *   @Roles('admin')                 // single role
 *   @Roles('admin', 'finance')      // any of these roles grants access
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
