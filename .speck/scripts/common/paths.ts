/**
 * Common path resolution and feature detection utilities
 *
 * Bun TypeScript implementation of common.sh
 *
 * Transformation Date: 2025-11-15
 * Source: upstream/v0.0.85/.specify/scripts/bash/common.sh
 * Strategy: Pure TypeScript (native path/fs operations)
 *
 * Changes from v0.0.84 to v0.0.85:
 * - Upstream added CDPATH="" to cd commands (security fix for bash path traversal)
 * - TypeScript implementation already immune: uses import.meta.dir and path.resolve()
 * - No code changes needed, only documentation updated to track v0.0.85
 *
 * All functions use pure TypeScript/Node.js APIs for maximum maintainability.
 */

import { existsSync } from "node:fs";
import { readdirSync } from "node:fs";
import path from "node:path";
import { $ } from "bun";

/**
 * Feature paths returned by getFeaturePaths()
 */
export interface FeaturePaths {
  REPO_ROOT: string;
  CURRENT_BRANCH: string;
  HAS_GIT: string;
  FEATURE_DIR: string;
  FEATURE_SPEC: string;
  IMPL_PLAN: string;
  TASKS: string;
  RESEARCH: string;
  DATA_MODEL: string;
  QUICKSTART: string;
  CONTRACTS_DIR: string;
}

/**
 * Detect if running from a plugin installation
 *
 * Checks for CLAUDE_PLUGIN_ROOT environment variable (set by Claude Code)
 * or path patterns indicating plugin installation.
 *
 * Plugin installations are located at:
 * - ~/.claude/plugins/marketplaces/<marketplace-name>/
 * - ~/.config/claude-code/plugins/<plugin-name>/
 *
 * Development installations have scripts at:
 * - <repo>/.speck/scripts/
 */
export function isPluginInstallation(): boolean {
  // Check for CLAUDE_PLUGIN_ROOT environment variable first
  if (process.env.CLAUDE_PLUGIN_ROOT) {
    return true;
  }

  // Fallback to path-based detection
  const scriptDir = import.meta.dir;
  return scriptDir.includes("/.claude/plugins/") ||
         scriptDir.includes("/.config/claude-code/plugins/");
}

/**
 * Get plugin root directory (where scripts/templates/commands live)
 *
 * In plugin installations: Uses CLAUDE_PLUGIN_ROOT env var or path resolution
 * In development: <repo-root>/
 */
export function getPluginRoot(): string {
  // Use CLAUDE_PLUGIN_ROOT if available (preferred method)
  if (process.env.CLAUDE_PLUGIN_ROOT) {
    return process.env.CLAUDE_PLUGIN_ROOT;
  }

  const scriptDir = import.meta.dir;

  if (isPluginInstallation()) {
    // In plugin: scripts are in <plugin-root>/.speck/scripts/common/
    // Navigate up from .speck/scripts/common to plugin root
    return path.resolve(scriptDir, "../../..");
  } else {
    // In development: scripts are in .speck/scripts/common/
    // Navigate up to repo root
    return path.resolve(scriptDir, "../../..");
  }
}

/**
 * Get templates directory path (works in both dev and plugin contexts)
 *
 * Both use the same structure: <root>/.specify/templates/
 */
export function getTemplatesDir(): string {
  const pluginRoot = getPluginRoot();
  return path.join(pluginRoot, ".specify/templates");
}

/**
 * Get scripts directory path (works in both dev and plugin contexts)
 *
 * Both use the same structure: <root>/.speck/scripts/
 */
export function getScriptsDir(): string {
  const pluginRoot = getPluginRoot();
  return path.join(pluginRoot, ".speck/scripts");
}

/**
 * Get memory directory path (works in both dev and plugin contexts)
 *
 * Both use the same structure: <root>/.specify/memory/
 */
export function getMemoryDir(): string {
  const pluginRoot = getPluginRoot();
  return path.join(pluginRoot, ".specify/memory");
}

/**
 * Get repository root directory
 *
 * Attempts to use git first, falls back to script location for non-git repos.
 */
export async function getRepoRoot(): Promise<string> {
  try {
    const result = await $`git rev-parse --show-toplevel`.quiet();
    return result.text().trim();
  } catch {
    // Fall back to script location for non-git repos
    const scriptDir = import.meta.dir;
    // Navigate up from .speck/scripts/common to repo root
    return path.resolve(scriptDir, "../../..");
  }
}

/**
 * Get current branch name
 *
 * Priority:
 * 1. SPECIFY_FEATURE environment variable
 * 2. Git branch (if git repo)
 * 3. Latest feature directory in specs/
 * 4. "main" as final fallback
 */
export async function getCurrentBranch(repoRoot: string): Promise<string> {
  // Check environment variable first
  if (process.env.SPECIFY_FEATURE) {
    return process.env.SPECIFY_FEATURE;
  }

  // Try git
  try {
    const result = await $`git rev-parse --abbrev-ref HEAD`.quiet();
    return result.text().trim();
  } catch {
    // For non-git repos, find latest feature directory
    const specsDir = path.join(repoRoot, "specs");

    if (existsSync(specsDir)) {
      let latestFeature = "";
      let highest = 0;

      const dirs = readdirSync(specsDir, { withFileTypes: true });
      for (const dir of dirs) {
        if (dir.isDirectory()) {
          const match = dir.name.match(/^(\d{3})-/);
          if (match) {
            const number = parseInt(match[1], 10);
            if (number > highest) {
              highest = number;
              latestFeature = dir.name;
            }
          }
        }
      }

      if (latestFeature) {
        return latestFeature;
      }
    }

    return "main";
  }
}

/**
 * Check if we have a git repository
 */
export async function hasGit(): Promise<boolean> {
  try {
    await $`git rev-parse --show-toplevel`.quiet();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if on a valid feature branch
 *
 * @param branch - Branch name to check
 * @param hasGitRepo - Whether we have a git repo
 * @returns true if valid, false otherwise (prints error to stderr)
 */
export function checkFeatureBranch(branch: string, hasGitRepo: boolean): boolean {
  // For non-git repos, we can't enforce branch naming
  if (!hasGitRepo) {
    console.error("[specify] Warning: Git repository not detected; skipped branch validation");
    return true;
  }

  // Check if branch matches pattern: ###-feature-name
  if (!/^\d{3}-/.test(branch)) {
    console.error(`ERROR: Not on a feature branch. Current branch: ${branch}`);
    console.error("Feature branches should be named like: 001-feature-name");
    return false;
  }

  return true;
}

/**
 * Get feature directory for a branch name
 *
 * Simple helper that joins repo root and specs directory
 */
export function getFeatureDir(repoRoot: string, branchName: string): string {
  return path.join(repoRoot, "specs", branchName);
}

/**
 * Find feature directory by numeric prefix
 *
 * Allows multiple branches to work on the same spec (e.g., 004-fix-bug, 004-add-feature)
 * Both would map to the first directory found starting with "004-"
 */
export function findFeatureDirByPrefix(repoRoot: string, branchName: string): string {
  const specsDir = path.join(repoRoot, "specs");

  // Extract numeric prefix from branch (e.g., "004" from "004-whatever")
  const match = branchName.match(/^(\d{3})-/);
  if (!match) {
    // If branch doesn't have numeric prefix, fall back to exact match
    return path.join(specsDir, branchName);
  }

  const prefix = match[1];

  // Search for directories starting with this prefix
  const matches: string[] = [];
  if (existsSync(specsDir)) {
    const dirs = readdirSync(specsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory() && dir.name.startsWith(`${prefix}-`)) {
        matches.push(dir.name);
      }
    }
  }

  // Handle results
  if (matches.length === 0) {
    // No match found - return the branch name path (will fail later with clear error)
    return path.join(specsDir, branchName);
  } else if (matches.length === 1) {
    // Exactly one match - perfect!
    return path.join(specsDir, matches[0]);
  } else {
    // Multiple matches - this shouldn't happen with proper naming convention
    console.error(`ERROR: Multiple spec directories found with prefix '${prefix}': ${matches.join(", ")}`);
    console.error("Please ensure only one spec directory exists per numeric prefix.");
    return path.join(specsDir, branchName);
  }
}

/**
 * Get all feature-related paths
 *
 * This is the main function used by other scripts to get their working environment.
 */
export async function getFeaturePaths(): Promise<FeaturePaths> {
  const repoRoot = await getRepoRoot();
  const currentBranch = await getCurrentBranch(repoRoot);
  const hasGitRepo = await hasGit();

  // Use prefix-based lookup to support multiple branches per spec
  const featureDir = findFeatureDirByPrefix(repoRoot, currentBranch);

  return {
    REPO_ROOT: repoRoot,
    CURRENT_BRANCH: currentBranch,
    HAS_GIT: hasGitRepo ? "true" : "false",
    FEATURE_DIR: featureDir,
    FEATURE_SPEC: path.join(featureDir, "spec.md"),
    IMPL_PLAN: path.join(featureDir, "plan.md"),
    TASKS: path.join(featureDir, "tasks.md"),
    RESEARCH: path.join(featureDir, "research.md"),
    DATA_MODEL: path.join(featureDir, "data-model.md"),
    QUICKSTART: path.join(featureDir, "quickstart.md"),
    CONTRACTS_DIR: path.join(featureDir, "contracts"),
  };
}

/**
 * Check if a file exists and print status
 * Used for human-readable output
 */
export function checkFile(filePath: string, label: string): string {
  return existsSync(filePath) ? `  ✓ ${label}` : `  ✗ ${label}`;
}

/**
 * Check if a directory exists and has files
 * Used for human-readable output
 */
export function checkDir(dirPath: string, label: string): string {
  if (!existsSync(dirPath)) {
    return `  ✗ ${label}`;
  }

  try {
    const files = readdirSync(dirPath);
    return files.length > 0 ? `  ✓ ${label}` : `  ✗ ${label}`;
  } catch {
    return `  ✗ ${label}`;
  }
}
