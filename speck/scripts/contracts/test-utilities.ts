/**
 * Test Utilities for Medium-Weight Testing
 *
 * Helper functions and fixtures for testing .speck/scripts/ implementations
 * and common/ utilities.
 */

import type {
  GitHubRelease,
  RateLimitInfo,
} from "./github-api";
import type {
  UpstreamRelease,
  ReleaseRegistry,
  ReleaseStatus,
} from "./release-registry";
import type { CliResult, ExitCode } from "./cli-interface";

/**
 * Create mock GitHub release for testing
 */
export function createMockGitHubRelease(
  overrides?: Partial<GitHubRelease>
): GitHubRelease {
  return {
    tag_name: "v1.0.0",
    target_commitish: "abc123" + "0".repeat(34), // 40 char SHA
    name: "Release v1.0.0",
    body: "This is a test release.\n\nWith multiple paragraphs.",
    published_at: "2025-11-15T00:00:00Z",
    draft: false,
    prerelease: false,
    tarball_url: "https://api.github.com/repos/owner/repo/tarball/v1.0.0",
    zipball_url: "https://api.github.com/repos/owner/repo/zipball/v1.0.0",
    url: "https://api.github.com/repos/owner/repo/releases/123",
    html_url: "https://github.com/owner/repo/releases/tag/v1.0.0",
    ...overrides,
  };
}

/**
 * Create mock upstream release for testing
 */
export function createMockUpstreamRelease(
  overrides?: Partial<UpstreamRelease>
): UpstreamRelease {
  return {
    version: "v1.0.0",
    commit: "abc123" + "0".repeat(34), // 40 char SHA
    pullDate: "2025-11-15T12:00:00Z",
    releaseNotesUrl: "https://github.com/owner/repo/releases/tag/v1.0.0",
    status: "pulled" as ReleaseStatus,
    ...overrides,
  };
}

/**
 * Create mock release registry for testing
 */
export function createMockReleaseRegistry(
  releases?: UpstreamRelease[]
): ReleaseRegistry {
  const defaultReleases = releases || [createMockUpstreamRelease()];
  const firstRelease = defaultReleases[0];
  if (!firstRelease) {
    throw new Error("At least one release required");
  }

  return {
    latest: firstRelease.version,
    releases: defaultReleases,
  };
}

/**
 * Create mock rate limit info for testing
 */
export function createMockRateLimitInfo(
  overrides?: Partial<RateLimitInfo>
): RateLimitInfo {
  return {
    remaining: 50,
    limit: 60,
    reset: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}

/**
 * Create mock CLI result for testing
 */
export function createMockCliResult<T = unknown>(
  exitCode: ExitCode,
  stdout = "",
  stderr = "",
  data?: T
): CliResult<T> {
  return {
    exitCode,
    stdout,
    stderr,
    data,
  };
}

/**
 * Mock filesystem for testing (in-memory)
 */
export class MockFilesystem {
  private files = new Map<string, string>();
  private symlinks = new Map<string, string>();

  writeFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  async readFile(path: string): Promise<string> {
    // Follow symlink if exists
    const target = this.symlinks.get(path);
    if (target) {
      return this.readFile(target);
    }

    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return content;
  }

  exists(path: string): boolean {
    return this.files.has(path) || this.symlinks.has(path);
  }

  async mkdir(_path: string): Promise<void> {
    // No-op for mock (assume directory creation always succeeds)
  }

  symlink(target: string, path: string): void {
    this.symlinks.set(path, target);
  }

  readlink(path: string): string {
    const target = this.symlinks.get(path);
    if (target === undefined) {
      throw new Error(`EINVAL: invalid argument, readlink '${path}'`);
    }
    return target;
  }

  unlink(path: string): void {
    this.files.delete(path);
    this.symlinks.delete(path);
  }

  rm(path: string, options?: { recursive?: boolean }): void {
    // Simple implementation: remove exact path or all paths starting with path/
    if (options?.recursive) {
      const prefix = path.endsWith("/") ? path : path + "/";
      for (const [key] of this.files) {
        if (key === path || key.startsWith(prefix)) {
          this.files.delete(key);
        }
      }
      for (const [key] of this.symlinks) {
        if (key === path || key.startsWith(prefix)) {
          this.symlinks.delete(key);
        }
      }
    } else {
      this.files.delete(path);
      this.symlinks.delete(path);
    }
  }

  reset(): void {
    this.files.clear();
    this.symlinks.clear();
  }
}

/**
 * Mock GitHub API client for testing
 */
export class MockGitHubApi {
  private releases: GitHubRelease[] = [];
  private rateLimit: RateLimitInfo = createMockRateLimitInfo();
  private shouldFail = false;
  private errorMessage = "Network error";

  setReleases(releases: GitHubRelease[]): void {
    this.releases = releases;
  }

  setRateLimit(rateLimit: RateLimitInfo): void {
    this.rateLimit = rateLimit;
  }

  setShouldFail(shouldFail: boolean, errorMessage = "Network error"): void {
    this.shouldFail = shouldFail;
    this.errorMessage = errorMessage;
  }

  fetchReleases(): {
    releases: GitHubRelease[];
    rateLimit: RateLimitInfo;
  } {
    if (this.shouldFail) {
      throw new Error(this.errorMessage);
    }

    return {
      releases: this.releases,
      rateLimit: this.rateLimit,
    };
  }

  reset(): void {
    this.releases = [];
    this.rateLimit = createMockRateLimitInfo();
    this.shouldFail = false;
    this.errorMessage = "Network error";
  }
}

/**
 * Fixture: Mock upstream directory structure
 */
export interface MockUpstreamDirectory {
  version: string;
  files: Record<string, string>;
}

/**
 * Create mock upstream directory fixture
 */
export function createMockUpstreamDirectory(
  version = "v1.0.0"
): MockUpstreamDirectory {
  return {
    version,
    files: {
      ".specify/templates/spec-template.md": "# Feature Specification\n...",
      ".specify/templates/plan-template.md": "# Implementation Plan\n...",
      ".specify/scripts/bash/setup-plan.sh":
        '#!/bin/bash\necho \'{"FEATURE_SPEC": "/path"}\'\n',
      ".claude/commands/speckit.plan.md": "# Plan Command\n...",
    },
  };
}

/**
 * Assert CLI result matches expected values
 */
export function assertCliResult(
  result: CliResult,
  expected: {
    exitCode: ExitCode;
    stdoutContains?: string;
    stderrContains?: string;
  }
): void {
  if (result.exitCode !== expected.exitCode) {
    throw new Error(
      `Expected exit code ${expected.exitCode}, got ${result.exitCode}`
    );
  }

  if (expected.stdoutContains && !result.stdout.includes(expected.stdoutContains)) {
    throw new Error(
      `Expected stdout to contain "${expected.stdoutContains}", got: ${result.stdout}`
    );
  }

  if (expected.stderrContains && !result.stderr.includes(expected.stderrContains)) {
    throw new Error(
      `Expected stderr to contain "${expected.stderrContains}", got: ${result.stderr}`
    );
  }
}

/**
 * Assert JSON output matches schema
 */
export function assertJsonOutput<T>(
  result: CliResult,
  validator: (data: unknown) => T
): T {
  if (result.exitCode !== 0 as ExitCode) {
    throw new Error(
      `Cannot validate JSON from failed command (exit ${String(result.exitCode)}): ${result.stderr}`
    );
  }

  try {
    const data = JSON.parse(result.stdout) as unknown;
    return validator(data);
  } catch (error) {
    throw new Error(
      `JSON validation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
