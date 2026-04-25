/**
 * IamSettingsService
 *
 * Fetches per-tenant platform settings from the IAM/auth microservice.
 * Only uses the public /settings/public endpoint — no authentication required.
 *
 * Results are cached in memory with a 5-minute TTL so that a GST rate change
 * in the IAM service is reflected across the fleet within 5 minutes without
 * any per-request HTTP overhead.
 *
 * If the IAM service is unreachable the service falls back to safe defaults
 * and logs a warning so the payment service never crashes due to a missing
 * dependency.
 */

import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';

export interface GstConfig {
  /** Total GST rate percentage, e.g. 18 for 18 % */
  gstRate: number;
  /** 'intra' → CGST + SGST, 'inter' → IGST */
  gstType: 'intra' | 'inter';
}

const GST_DEFAULTS: GstConfig = { gstRate: 18, gstType: 'intra' };

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  value: GstConfig;
  expiresAt: number;
}

@Injectable()
export class IamSettingsService {
  private readonly logger = new Logger(IamSettingsService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly config: AppConfigService) {}

  /**
   * Returns the effective GST configuration for a tenant.
   * The IAM service applies the override chain:
   *   tenant setting  →  global default  →  code default
   */
  async getGstConfig(tenantId: string): Promise<GstConfig> {
    const cached = this.cache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const value = await this.fetchFromIam(tenantId);
    this.cache.set(tenantId, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  }

  /** Manually invalidate cached settings for a tenant (e.g. after a PUT /settings call). */
  invalidate(tenantId: string): void {
    this.cache.delete(tenantId);
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async fetchFromIam(tenantId: string): Promise<GstConfig> {
    const baseUrl = this.config.iamServiceUrl;
    if (!baseUrl) {
      this.logger.warn('IAM_SERVICE_URL is not configured — using default GST config');
      return GST_DEFAULTS;
    }

    try {
      const url = `${baseUrl}/api/v1/settings/public?tenantId=${encodeURIComponent(tenantId)}`;
      const headers: Record<string, string> = { Accept: 'application/json' };
      const apiKey = this.config.iamServiceApiKey;
      if (apiKey) headers['x-api-key'] = apiKey;

      const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = (await res.json()) as Record<string, unknown>;
      const gstRate = this.parseRate(data['payment.gst.default_rate']);
      const gstType = this.parseType(data['payment.gst.default_type']);

      return { gstRate, gstType };
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to fetch GST config from IAM service for tenant ${tenantId}: ${(err as Error).message ?? 'unknown'} — using defaults`,
      );
      return GST_DEFAULTS;
    }
  }

  private parseRate(raw: unknown): number {
    const n = Number(raw);
    return !isNaN(n) && n > 0 ? n : GST_DEFAULTS.gstRate;
  }

  private parseType(raw: unknown): 'intra' | 'inter' {
    return raw === 'inter' ? 'inter' : 'intra';
  }
}
