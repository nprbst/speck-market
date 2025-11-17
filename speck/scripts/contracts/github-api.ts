/**
 * GitHub REST API Contracts
 *
 * TypeScript interfaces for GitHub REST API responses used in upstream
 * release fetching.
 */

/**
 * GitHub Release object from /repos/{owner}/{repo}/releases
 */
export interface GitHubRelease {
  /** Release tag name (e.g., "v1.0.0") */
  tag_name: string;

  /** Commit SHA this release points to */
  target_commitish: string;

  /** Release title */
  name: string;

  /** Release notes (markdown) */
  body: string;

  /** Publication timestamp (ISO 8601) */
  published_at: string;

  /** Is this a draft release? */
  draft: boolean;

  /** Is this a pre-release? */
  prerelease: boolean;

  /** URL to download tarball */
  tarball_url: string;

  /** URL to download zipball */
  zipball_url: string;

  /** GitHub API URL for this release */
  url: string;

  /** GitHub HTML URL for this release */
  html_url: string;
}

/**
 * GitHub API error response
 */
export interface GitHubApiError {
  message: string;
  documentation_url?: string;
}

/**
 * GitHub API rate limit headers
 */
export interface RateLimitInfo {
  /** Requests remaining in current window */
  remaining: number;

  /** Total requests allowed per window */
  limit: number;

  /** Timestamp when rate limit resets (Unix epoch seconds) */
  reset: number;
}

/**
 * Options for GitHub API client
 */
export interface GitHubApiOptions {
  /** GitHub API base URL (defaults to https://api.github.com) */
  baseUrl?: string;

  /** User-Agent header (required by GitHub API) */
  userAgent?: string;

  /** Optional personal access token for authenticated requests */
  token?: string;

  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Result from fetching releases
 */
export interface FetchReleasesResult {
  /** Array of releases (sorted by published_at descending) */
  releases: GitHubRelease[];

  /** Rate limit information from response headers */
  rateLimit: RateLimitInfo;

  /** ETag for conditional requests (caching) */
  etag?: string;
}

/**
 * Parse rate limit info from response headers
 */
export function parseRateLimitHeaders(headers: Headers): RateLimitInfo {
  return {
    remaining: parseInt(headers.get("X-RateLimit-Remaining") || "0", 10),
    limit: parseInt(headers.get("X-RateLimit-Limit") || "60", 10),
    reset: parseInt(headers.get("X-RateLimit-Reset") || "0", 10),
  };
}

/**
 * Check if rate limit is approaching (< 10 requests remaining)
 */
export function isRateLimitLow(rateLimit: RateLimitInfo): boolean {
  return rateLimit.remaining < 10;
}

/**
 * Calculate seconds until rate limit reset
 */
export function secondsUntilReset(rateLimit: RateLimitInfo): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, rateLimit.reset - now);
}

/**
 * Filter releases to exclude drafts and pre-releases
 */
export function filterStableReleases(releases: GitHubRelease[]): GitHubRelease[] {
  return releases.filter((r) => !r.draft && !r.prerelease);
}

/**
 * Sort releases by published date (newest first)
 */
export function sortReleasesByDate(releases: GitHubRelease[]): GitHubRelease[] {
  return releases.sort(
    (a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
}

/**
 * Extract release notes summary (first paragraph or first 200 chars)
 */
export function extractNotesSummary(body: string, maxLength = 200): string {
  // Get first paragraph (split on double newline)
  const firstParagraph = body.split("\n\n")[0] || "";

  // Truncate to maxLength if needed
  if (firstParagraph.length > maxLength) {
    return firstParagraph.substring(0, maxLength) + "...";
  }

  return firstParagraph;
}
