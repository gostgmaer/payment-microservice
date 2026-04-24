import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route as public (skip JWT auth guard).
 * Webhook endpoints and health checks use this decorator.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
