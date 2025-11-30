/**
 * Naming and Path Construction for Worktrees
 *
 * This module handles worktree naming logic based on repository layout
 * and constructs paths for worktree creation.
 */

import { basename, dirname, join, resolve } from "path";
import { $ } from "bun";
import type { WorktreeConfig } from "./config-schema";

/**
 * Repository layout detection result
 */
export type RepoLayout = "repo-name-dir" | "branch-name-dir";

/**
 * Detect repository layout to determine worktree naming strategy
 *
 * Two modes:
 * 1. "repo-name-dir": Directory name matches repository name
 *    → Use prefix: `<repo-name>-<branch-name>`
 * 2. "branch-name-dir": Directory name matches branch name
 *    → Use no prefix: `<branch-name>`
 *
 * @param repoPath - Absolute path to repository root
 * @returns Repository layout type
 */
export async function detectRepoLayout(repoPath: string): Promise<RepoLayout> {
  try {
    // Get the current branch name
    const result = await $`git -C ${repoPath} rev-parse --abbrev-ref HEAD`.quiet();
    const currentBranch = result.stdout.toString().trim();

    // Get the directory name
    const dirName = basename(repoPath);

    // Check if directory name matches current branch name
    if (dirName === currentBranch) {
      return "branch-name-dir";
    }

    // Default to repo-name-dir layout
    return "repo-name-dir";
  } catch {
    // If git command fails, default to repo-name-dir
    return "repo-name-dir";
  }
}

/**
 * Get repository name for worktree naming
 *
 * Tries to extract from git remote URL, falls back to directory name
 *
 * @param repoPath - Absolute path to repository root
 * @returns Repository name (e.g., "speck", "my-app")
 */
export async function getRepoName(repoPath: string): Promise<string> {
  try {
    // Try to get remote URL
    const result = await $`git -C ${repoPath} remote get-url origin`.quiet();
    const remoteUrl = result.stdout.toString().trim();

    // Extract repo name from URL (handles both HTTPS and SSH)
    // Examples:
    // - https://github.com/user/repo.git → repo
    // - git@github.com:user/repo.git → repo
    // - https://github.com/user/repo → repo
    const match = remoteUrl.match(/\/([^/]+?)(\.git)?$/);
    if (match && match[1]) {
      return match[1];
    }
  } catch {
    // Fall through to directory name
  }

  // Fallback: use directory name
  return basename(repoPath);
}

/**
 * Slugify branch name for use in directory paths
 *
 * Converts branch name to a safe directory name:
 * - Remove or replace unsafe characters
 * - Convert to lowercase
 * - Replace slashes with dashes
 *
 * @param branchName - Original branch name
 * @returns Slugified branch name safe for filesystem
 */
export function slugifyBranchName(branchName: string): string {
  return branchName
    .toLowerCase()
    .replace(/\//g, "-")     // Replace slashes with dashes
    .replace(/[^a-z0-9-_]/g, "-") // Replace unsafe chars with dash
    .replace(/-+/g, "-")     // Collapse multiple dashes
    .replace(/^-|-$/g, "");  // Remove leading/trailing dashes
}

/**
 * Construct worktree directory name based on repository layout
 *
 * @param repoPath - Absolute path to repository root
 * @param branchName - Branch name (without prefix)
 * @returns Worktree directory name (e.g., "speck-012-worktree" or "012-worktree")
 */
export async function constructWorktreeDirName(
  repoPath: string,
  branchName: string
): Promise<string> {
  const layout = await detectRepoLayout(repoPath);
  const slugifiedBranch = slugifyBranchName(branchName);

  if (layout === "branch-name-dir") {
    // No prefix needed
    return slugifiedBranch;
  } else {
    // Prefix with repo name
    const repoName = await getRepoName(repoPath);
    return `${repoName}-${slugifiedBranch}`;
  }
}

/**
 * Construct full branch name with optional prefix
 *
 * @param branchName - Base branch name (e.g., "002-user-auth")
 * @param prefix - Optional prefix (e.g., "specs/", "feature/")
 * @returns Full branch name (e.g., "specs/002-user-auth" or "002-user-auth")
 */
export function constructBranchName(
  branchName: string,
  prefix?: string
): string {
  if (!prefix) {
    return branchName;
  }

  // Ensure prefix ends with slash
  const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
  return `${normalizedPrefix}${branchName}`;
}

/**
 * Construct worktree path from config and branch name
 *
 * Creates worktree as sibling directory to main repository:
 * - Main repo: /path/to/speck/
 * - Worktree: /path/to/speck-012-worktree/
 *
 * @param repoPath - Absolute path to repository root
 * @param config - Worktree configuration
 * @param branchName - Branch name (without prefix)
 * @returns Absolute path to worktree location
 */
export async function constructWorktreePath(
  repoPath: string,
  _config: WorktreeConfig,
  branchName: string
): Promise<string> {
  // Get the parent directory of the repository
  const parentDir = dirname(repoPath);

  // Construct worktree directory name based on layout
  const worktreeDirName = await constructWorktreeDirName(repoPath, branchName);

  // Return absolute path to worktree
  return resolve(join(parentDir, worktreeDirName));
}
