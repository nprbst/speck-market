/**
 * GitHub API Client
 *
 * Provides functions for fetching spec-kit releases from GitHub REST API.
 */

import type {
  GitHubRelease,
  GitHubApiError,
  RateLimitInfo,
  GitHubApiOptions,
  FetchReleasesResult,
} from "../contracts/github-api";
import {
  parseRateLimitHeaders,
  isRateLimitLow,
  secondsUntilReset,
} from "../contracts/github-api";

const DEFAULT_BASE_URL = "https://api.github.com";
const DEFAULT_USER_AGENT = "speck-upstream-sync";
const DEFAULT_TIMEOUT = 10000; // 10 seconds

/**
 * GitHub API client error
 */
export class GitHubApiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly rateLimit?: RateLimitInfo
  ) {
    super(message);
    this.name = "GitHubApiClientError";
  }
}

/**
 * Fetch releases from GitHub repository
 *
 * @param owner - Repository owner (e.g., "anthropics")
 * @param repo - Repository name (e.g., "spec-kit")
 * @param options - API client options
 * @returns Release data including releases array and rate limit info
 *
 * @example
 * ```typescript
 * const result = await fetchReleases("anthropics", "spec-kit");
 * console.log(`Found ${result.releases.length} releases`);
 * console.log(`Rate limit remaining: ${result.rateLimit.remaining}`);
 * ```
 */
export async function fetchReleases(
  owner: string,
  repo: string,
  options: GitHubApiOptions = {}
): Promise<FetchReleasesResult> {
  const {
    baseUrl = DEFAULT_BASE_URL,
    userAgent = DEFAULT_USER_AGENT,
    token,
    timeout = DEFAULT_TIMEOUT,
  } = options;

  const url = `${baseUrl}/repos/${owner}/${repo}/releases`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": userAgent,
  };

  if (token) {
    headers.Authorization = `token ${token}`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const rateLimit = parseRateLimitHeaders(response.headers);

    // Check rate limit
    if (isRateLimitLow(rateLimit)) {
      const secondsRemaining = secondsUntilReset(rateLimit);
      console.warn(
        `GitHub API rate limit low: ${rateLimit.remaining} requests remaining. Resets in ${secondsRemaining}s.`
      );
    }

    if (!response.ok) {
      const errorData = (await response.json()) as GitHubApiError;
      throw new GitHubApiClientError(
        `GitHub API error: ${errorData.message}`,
        response.status,
        rateLimit
      );
    }

    const releases = (await response.json()) as GitHubRelease[];
    const etag = response.headers.get("ETag") || undefined;

    return {
      releases,
      rateLimit,
      etag,
    };
  } catch (error) {
    if (error instanceof GitHubApiClientError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new GitHubApiClientError(
          `Request timeout after ${timeout}ms`
        );
      }
      throw new GitHubApiClientError(`Network error: ${error.message}`);
    }

    throw new GitHubApiClientError("Unknown error fetching releases");
  }
}

/**
 * Download release tarball to a file
 *
 * @param tarballUrl - URL to the release tarball
 * @param destPath - Destination file path
 * @param options - API client options
 *
 * @example
 * ```typescript
 * await downloadTarball(
 *   "https://api.github.com/repos/owner/repo/tarball/v1.0.0",
 *   "/tmp/release.tar.gz"
 * );
 * ```
 */
export async function downloadTarball(
  tarballUrl: string,
  destPath: string,
  options: GitHubApiOptions = {}
): Promise<void> {
  const {
    userAgent = DEFAULT_USER_AGENT,
    token,
    timeout = 120000, // 2 minutes for downloads
  } = options;

  const headers: Record<string, string> = {
    "User-Agent": userAgent,
  };

  if (token) {
    headers.Authorization = `token ${token}`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(tarballUrl, {
      headers,
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new GitHubApiClientError(
        `Failed to download tarball: ${response.statusText}`,
        response.status
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    await Bun.write(destPath, arrayBuffer);
  } catch (error) {
    if (error instanceof GitHubApiClientError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new GitHubApiClientError(
          `Download timeout after ${timeout}ms`
        );
      }
      throw new GitHubApiClientError(`Download error: ${error.message}`);
    }

    throw new GitHubApiClientError("Unknown error downloading tarball");
  }
}
