import crypto from 'crypto';
import { Database } from './db';
import { CacheEntry } from './types';
import { CostAccountingService } from './pricing';

export interface CacheCheckParams {
  tenantId: string;
  prompt: string;
  systemInstruction?: string;
  modelId: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CacheHitResult {
  isHit: boolean;
  cachedEntry?: CacheEntry;
  avoidedCost: number;
  lookupLatencyMs: number;
}

export class CacheEngine {
  /**
   * Normalizes prompt content: trims, strips superfluous internal whitespace, lowercases keys where appropriate.
   */
  public static normalizeContent(text: string): string {
    if (!text) return '';
    return text
      .trim()
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      .replace(/\n{2,}/g, '\n');
  }

  /**
   * Generates a deterministic SHA-256 cache key including tenant, prompt, system instruction, and parameters.
   */
  public static generateKey(params: CacheCheckParams): string {
    const normalizedPrompt = this.normalizeContent(params.prompt);
    const normalizedSystem = this.normalizeContent(params.systemInstruction || '');
    const temp = (params.temperature ?? 0.7).toFixed(2);
    const version = 'v1';

    const payload = [
      `tenant:${params.tenantId}`,
      `prompt:${normalizedPrompt}`,
      `sys:${normalizedSystem}`,
      `model:${params.modelId}`,
      `temp:${temp}`,
      `v:${version}`,
    ].join('||');

    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Look up cache entry.
   */
  public static lookup(params: CacheCheckParams): CacheHitResult {
    const start = Date.now();
    const cacheKey = this.generateKey(params);
    const entry = Database.getCacheEntry(params.tenantId, cacheKey);
    const lookupLatencyMs = Math.max(1, Date.now() - start);

    if (entry) {
      entry.hitCount += 1;
      entry.lastAccessedAt = new Date().toISOString();
      Database.save();

      return {
        isHit: true,
        cachedEntry: entry,
        avoidedCost: entry.costAvoided,
        lookupLatencyMs,
      };
    }

    return {
      isHit: false,
      avoidedCost: 0,
      lookupLatencyMs,
    };
  }

  /**
   * Stores a new cache entry.
   */
  public static store(
    params: CacheCheckParams,
    responseText: string,
    inputTokens: number,
    outputTokens: number,
    costAvoided: number,
    ttlSeconds: number = 86400
  ): CacheEntry {
    const cacheKey = this.generateKey(params);
    const normalizedPrompt = this.normalizeContent(params.prompt);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();

    const entry: CacheEntry = {
      id: `cch_${crypto.randomUUID()}`,
      tenantId: params.tenantId,
      cacheKey,
      normalizedPrompt,
      systemInstruction: params.systemInstruction,
      modelId: params.modelId,
      temperature: params.temperature ?? 0.7,
      responseText,
      inputTokens,
      outputTokens,
      costAvoided,
      hitCount: 0,
      createdAt: now.toISOString(),
      lastAccessedAt: now.toISOString(),
      expiresAt,
    };

    return Database.setCacheEntry(entry);
  }

  /**
   * Computes cache analytics for a tenant.
   */
  public static getAnalytics(tenantId: string) {
    const entries = Database.getCacheEntries(tenantId);
    const totalEntries = entries.length;
    const totalHits = entries.reduce((acc, curr) => acc + curr.hitCount, 0);
    const totalCostAvoided = entries.reduce(
      (acc, curr) => acc + curr.costAvoided * Math.max(1, curr.hitCount),
      0
    );
    const totalStorageBytes = entries.reduce(
      (acc, curr) => acc + (curr.responseText.length + curr.normalizedPrompt.length) * 2,
      0
    );

    return {
      totalEntries,
      totalHits,
      totalCostAvoided: Number(totalCostAvoided.toFixed(6)),
      totalStorageKb: Number((totalStorageBytes / 1024).toFixed(2)),
      entries: entries.slice(0, 50), // latest 50 entries
    };
  }

  /**
   * Clears cache for a tenant.
   */
  public static clear(tenantId: string): number {
    return Database.clearCache(tenantId);
  }
}
