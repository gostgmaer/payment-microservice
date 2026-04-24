import { SetMetadata } from '@nestjs/common';
import { Permission } from '../rbac/permissions';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Declare which permissions are required to access a route or controller.
 * ALL listed permissions must be present (AND logic).
 *
 * Usage:
 *   @RequirePermission(Permission.PAYMENT_READ)
 *   @RequirePermission(Permission.ADMIN_TRANSACTIONS, Permission.ADMIN_AUDIT)
 */
export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
