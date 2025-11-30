/**
 * Prerequisite Check Caching
 *
 * Provides TTL-based caching for prerequisite check results to avoid
 * redundant checks when user runs multiple slash commands rapidly.
 *
 * Cache TTL: 5 seconds (per research.md decision 7)
 * Invalidation: Manual via invalidateCache() on git operations
 *
 * @module prereq-cache
 */

import type { ValidationOutput } from "../check-prerequisites";

/**
 * Cached prerequisite check result
 */
export interface CachedPrereqResult {
  success: boolean;
  output: ValidationOutput | null;
  error: string | null;
  timestamp: number;
}

/**
 * Cache TTL in milliseconds (5 seconds)
 */
const CACHE_TTL_MS = 5000;

/**
 * In-memory cache for prerequisite results
 * (per-process, not persisted to disk)
 */
let cachedResult: CachedPrereqResult | null = null;

/**
 * Get cached prerequisite result if still valid
 *
 * @returns Cached result if within TTL, null otherwise
 */
export function getCachedResult(): CachedPrereqResult | null {
  if (!cachedResult) {
    return null;
  }

  const now = Date.now();
  const age = now - cachedResult.timestamp;

  if (age > CACHE_TTL_MS) {
    // Cache expired
    cachedResult = null;
    return null;
  }

  return cachedResult;
}

/**
 * Cache a prerequisite check result
 *
 * @param result - The result to cache
 */
export function cacheResult(result: CachedPrereqResult): void {
  cachedResult = result;
}

/**
 * Invalidate the cache (e.g., after git operations)
 */
export function invalidateCache(): void {
  cachedResult = null;
}

/**
 * Get cache statistics for debugging
 *
 * @returns Cache stats object
 */
export function getCacheStats(): {
  isCached: boolean;
  ageMs: number | null;
  ttlMs: number;
} {
  if (!cachedResult) {
    return {
      isCached: false,
      ageMs: null,
      ttlMs: CACHE_TTL_MS,
    };
  }

  const now = Date.now();
  const age = now - cachedResult.timestamp;

  return {
    isCached: true,
    ageMs: age,
    ttlMs: CACHE_TTL_MS,
  };
}
