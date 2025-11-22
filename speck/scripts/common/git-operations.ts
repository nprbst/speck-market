/**
 * Git Operations for Stacked PR Support
 *
 * Wrapper functions for git commands with proper error handling
 *
 * Feature: 008-stacked-pr-support
 * Created: 2025-11-18
 */

import { $ } from "bun";
import { GitError } from "./errors.js";

// T092 - Cache for default branch detection per repo (module-level for command session)
const defaultBranchCache = new Map<string, string | null>();

/**
 * Create a git branch (T020)
 *
 * @param name - Branch name to create
 * @param base - Base branch to create from
 * @param repoRoot - Repository root directory
 * @throws GitError if operation fails
 */
export async function createGitBranch(
  name: string,
  base: string,
  repoRoot: string
): Promise<void> {
  // Validate base exists
  const baseCheck = await $`git -C ${repoRoot} rev-parse --verify ${base}`.quiet();
  if (baseCheck.exitCode !== 0) {
    throw new GitError(`Base branch '${base}' does not exist`);
  }

  // Validate branch name format
  const nameCheck = await $`git check-ref-format --branch ${name}`.quiet();
  if (nameCheck.exitCode !== 0) {
    throw new GitError(`Invalid branch name: '${name}'`);
  }

  // Create branch
  const result = await $`git -C ${repoRoot} branch ${name} ${base}`.quiet();
  if (result.exitCode !== 0) {
    const stderr = result.stderr.toString();
    throw new GitError(`Failed to create branch: ${stderr}`);
  }
}

/**
 * Check if branch has been merged into base (T021)
 *
 * @param branchName - Branch to check
 * @param baseBranch - Base branch to check against
 * @param repoRoot - Repository root directory
 * @returns true if branch is merged, false otherwise
 * @throws GitError if operation fails
 */
export async function checkBranchMerged(
  branchName: string,
  baseBranch: string,
  repoRoot: string
): Promise<boolean> {
  try {
    const result = await $`git -C ${repoRoot} branch --merged ${baseBranch}`.quiet();
    if (result.exitCode !== 0) {
      throw new GitError(`Failed to check merged status for '${branchName}'`);
    }

    const output = result.text();
    const mergedBranches = output
      .split("\n")
      .map(line => line.trim().replace(/^\*\s*/, ""))
      .filter(Boolean);

    return mergedBranches.includes(branchName);
  } catch (error) {
    if (error instanceof GitError) throw error;
    throw new GitError(`Failed to check merged status: ${String(error)}`);
  }
}

/**
 * List all git branches (T022)
 *
 * @param repoRoot - Repository root directory
 * @param pattern - Optional pattern to filter branches (e.g., "username/*")
 * @returns Array of branch information { name, upstream }
 * @throws GitError if operation fails
 */
export async function listGitBranches(
  repoRoot: string,
  pattern?: string
): Promise<Array<{ name: string; upstream: string | null }>> {
  try {
    const args = pattern
      ? `git -C ${repoRoot} branch --list --format='%(refname:short)|%(upstream:short)' ${pattern}`
      : `git -C ${repoRoot} branch --list --format='%(refname:short)|%(upstream:short)'`;

    const result = await $`sh -c ${args}`.quiet();
    if (result.exitCode !== 0) {
      const stderr = result.stderr.toString();
      throw new GitError(`Failed to list branches: ${stderr}`);
    }

    const output = result.stdout.toString();
    return output
      .split("\n")
      .filter(Boolean)
      .map(line => {
        const [name, upstream] = line.split("|");
        if (!name) throw new GitError("Invalid branch line format");
        return {
          name: name.trim(),
          upstream: upstream?.trim() || null,
        };
      });
  } catch (error) {
    if (error instanceof GitError) throw error;
    throw new GitError(`Failed to list branches: ${String(error)}`);
  }
}

/**
 * Checkout a git branch
 *
 * @param name - Branch name to checkout
 * @param repoRoot - Repository root directory
 * @throws GitError if operation fails
 */
export async function checkoutBranch(
  name: string,
  repoRoot: string
): Promise<void> {
  const result = await $`git -C ${repoRoot} checkout ${name}`.quiet();
  if (result.exitCode !== 0) {
    const stderr = result.stderr.toString();
    throw new GitError(`Failed to checkout branch '${name}': ${stderr}`);
  }
}

/**
 * Get current branch name
 *
 * @param repoRoot - Repository root directory
 * @returns Current branch name
 * @throws GitError if operation fails or in detached HEAD state
 */
export async function getCurrentBranch(repoRoot: string): Promise<string> {
  const result = await $`git -C ${repoRoot} rev-parse --abbrev-ref HEAD`.quiet();
  if (result.exitCode !== 0) {
    throw new GitError("Failed to get current branch");
  }

  const branch = result.stdout.toString().trim();
  if (branch === "HEAD") {
    throw new GitError("Currently in detached HEAD state");
  }

  return branch;
}

/**
 * Check if branch exists in git
 *
 * @param name - Branch name to check
 * @param repoRoot - Repository root directory
 * @returns true if branch exists, false otherwise
 */
export async function branchExists(
  name: string,
  repoRoot: string
): Promise<boolean> {
  try {
    const result = await $`git -C ${repoRoot} rev-parse --verify ${name}`.quiet();
    return result.exitCode === 0;
  } catch {
    // Branch doesn't exist or other error occurred
    return false;
  }
}

/**
 * T010 - Validate base branch exists in local repository (Feature 009)
 *
 * Prevents cross-repo branch dependencies by ensuring base branch
 * exists in the current repository only.
 *
 * @param baseBranch - Base branch name to validate
 * @param repoRoot - Repository root directory
 * @throws GitError with suggested alternatives if validation fails
 */
export async function validateBaseBranch(
  baseBranch: string,
  repoRoot: string
): Promise<void> {
  // Get all local git branches
  const result = await $`git -C ${repoRoot} branch --list ${baseBranch}`.quiet();

  if (result.exitCode !== 0 || !result.stdout.toString().trim()) {
    // Branch doesn't exist locally
    throw new GitError(
      `Base branch '${baseBranch}' does not exist in current repository.\n\n` +
      `Cross-repo branch dependencies are not supported.\n\n` +
      `Alternatives:\n` +
      `  1. Complete work in other repo first and merge to main\n` +
      `  2. Use shared contracts/APIs for coordination\n` +
      `  3. Manually coordinate PR merge order across repos`
    );
  }
}

/**
 * T011 & T111 - Detect default branch name (Feature 009)
 *
 * Checks for main, master, or develop branch in order of preference.
 * Uses git symbolic-ref HEAD to determine the default branch.
 *
 * @param repoRoot - Repository root directory
 * @returns Default branch name (main, master, develop, or null)
 */
export async function detectDefaultBranch(repoRoot: string): Promise<string | null> {
  // T092 - Check cache first
  if (defaultBranchCache.has(repoRoot)) {
    return defaultBranchCache.get(repoRoot)!;
  }

  try {
    // Try git symbolic-ref to get default branch from origin/HEAD
    const result = await $`git -C ${repoRoot} symbolic-ref refs/remotes/origin/HEAD`.quiet();

    if (result.exitCode === 0) {
      const output = result.stdout.toString().trim();
      // Output format: refs/remotes/origin/main
      const match = output.match(/refs\/remotes\/origin\/(.+)/);
      if (match && match[1]) {
        const branch: string = match[1];
        defaultBranchCache.set(repoRoot, branch);
        return branch;
      }
    }
  } catch {
    // Fall through to branch checking
  }

  // Fallback: Check for existence of common default branches
  const commonDefaults = ['main', 'master', 'develop'];

  for (const branchName of commonDefaults) {
    const exists = await branchExists(branchName, repoRoot);
    if (exists) {
      defaultBranchCache.set(repoRoot, branchName);
      return branchName;
    }
  }

  // T092 - Cache null result to avoid repeated checks
  defaultBranchCache.set(repoRoot, null);
  return null;
}

/**
 * T107 - Detect remote URL in repository (Feature 009)
 *
 * Checks if repository has a remote configured.
 *
 * @param repoRoot - Repository root directory
 * @returns Remote URL or null if no remote configured
 */
export async function detectRemoteUrl(repoRoot: string): Promise<string | null> {
  try {
    const result = await $`git -C ${repoRoot} remote get-url origin`.quiet();

    if (result.exitCode === 0) {
      return result.stdout.toString().trim();
    }

    return null;
  } catch {
    return null;
  }
}
