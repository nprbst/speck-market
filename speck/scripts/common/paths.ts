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
import fs from "node:fs/promises";
import path from "node:path";
import { $ } from "bun";

// [SPECK-EXTENSION:START] Multi-repo detection
/**
 * Speck configuration - detected mode and paths
 */
export interface SpeckConfig {
  mode: 'single-repo' | 'multi-repo';
  speckRoot: string;     // Directory containing specs/
  repoRoot: string;      // Git repository root
  specsDir: string;      // Full path to specs/
}

/**
 * Multi-repo context metadata (Feature 009)
 * Extended version of SpeckConfig with context information
 */
export interface MultiRepoContextMetadata extends SpeckConfig {
  context: 'single' | 'root' | 'child';  // Execution context
  parentSpecId: string | null;           // Parent spec ID (child context only)
  childRepoName: string | null;          // Child directory name (child context only)
}
// [SPECK-EXTENSION:END]

/**
 * Branch entry in branches.json (Feature 008)
 */
interface BranchEntry {
  name: string;
  specId?: string;
  parentSpecId?: string;
  [key: string]: unknown;
}

/**
 * Branches mapping file structure (Feature 008)
 */
interface BranchesMapping {
  branches?: BranchEntry[];
  [key: string]: unknown;
}

/**
 * Feature paths returned by getFeaturePaths()
 */
export interface FeaturePaths {
  // [SPECK-EXTENSION:START] Multi-repo fields
  MODE: 'single-repo' | 'multi-repo';
  SPECK_ROOT: string;
  SPECS_DIR: string;
  // [SPECK-EXTENSION:END]
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
  CHECKLISTS_DIR: string;
  LINKED_REPOS: string;
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

  // Handle bundled CLI case: dist/speck-cli.js
  // scriptDir will be <plugin-root>/dist/ so go up 1 level
  if (scriptDir.endsWith("/dist") || scriptDir.includes("/dist/")) {
    return path.resolve(scriptDir, "..");
  }

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
 * Plugin installations: <plugin-root>/templates/
 * Development: <repo-root>/.speck/templates/
 */
export function getTemplatesDir(): string {
  const pluginRoot = getPluginRoot();
  if (isPluginInstallation()) {
    return path.join(pluginRoot, "templates");
  } else {
    return path.join(pluginRoot, ".speck/templates");
  }
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
 * Plugin installations: <plugin-root>/memory/
 * Development: <repo-root>/.speck/memory/
 */
export function getMemoryDir(): string {
  const pluginRoot = getPluginRoot();
  if (isPluginInstallation()) {
    return path.join(pluginRoot, "memory");
  } else {
    return path.join(pluginRoot, ".speck/memory");
  }
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
    // Fall back to current working directory for non-git repos
    // This ensures hooks work correctly when executed from user's directory
    return process.cwd();
  }
}

// [SPECK-EXTENSION:START] Multi-repo detection
/**
 * Cache for detectSpeckRoot() to avoid repeated filesystem checks
 */
let cachedConfig: SpeckConfig | null = null;

/**
 * Clear the cached speck configuration
 * Useful when .speck/root symlink is modified
 */
export function clearSpeckCache(): void {
  cachedConfig = null;
}

/**
 * Detect speck root and operating mode
 *
 * Checks for .speck/root symlink to determine if running in multi-repo mode.
 * - Single-repo: No symlink, specs at repo root
 * - Multi-repo: Symlink present, specs at symlink target
 *
 * @returns SpeckConfig with mode, speckRoot, repoRoot, specsDir
 */
export async function detectSpeckRoot(): Promise<SpeckConfig> {
  // Return cached result if available
  if (cachedConfig) {
    return cachedConfig;
  }

  // Check CWD first for .speck/root - needed for monorepo packages
  // In a monorepo, packages share the same git root but have their own .speck/ directories
  const cwd = process.cwd();
  const cwdSymlinkPath = path.join(cwd, '.speck', 'root');
  try {
    const cwdStats = await fs.lstat(cwdSymlinkPath);
    if (cwdStats.isSymbolicLink()) {
      // CWD has .speck/root symlink - this is a monorepo package or multi-repo child
      const speckRoot = await fs.realpath(cwdSymlinkPath);

      // Security: Validate symlink target doesn't escape to sensitive paths
      const dangerousPaths = ['/', '/etc', '/usr', '/bin', '/sbin', '/System', '/Library'];
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      if (dangerousPaths.some(dangerous => speckRoot === dangerous || speckRoot.startsWith(dangerous + '/'))) {
        throw new Error(
          `Security: .speck/root symlink points to system directory: ${speckRoot}\n` +
          'Speck root must be a user-owned project directory.\n' +
          'Fix: rm .speck/root && /speck:link <safe-project-path>'
        );
      }
      if (homeDir && speckRoot === path.dirname(homeDir)) {
        throw new Error(
          `Security: .speck/root symlink points above home directory: ${speckRoot}\n` +
          'Fix: rm .speck/root && /speck:link <project-path-within-home>'
        );
      }

      // Verify target exists
      await fs.access(speckRoot);

      const config: SpeckConfig = {
        mode: 'multi-repo',
        speckRoot,
        repoRoot: cwd,  // Use CWD as repoRoot for local artifacts
        specsDir: path.join(speckRoot, 'specs')
      };
      cachedConfig = config;
      return config;
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    // Only ignore ENOENT (file not found) - rethrow security/other errors
    if (err.code !== 'ENOENT' && err.message?.includes('Security:')) {
      throw error;
    }
    // No .speck/root at CWD, continue to git root check
  }

  const repoRoot = await getRepoRoot();

  // T120: Handle worktree case - check main worktree's .speck/root symlink
  // When running from a worktree, the worktree itself doesn't have .speck/root
  // but the main repository (from which the worktree was created) might have it
  let mainRepoRoot = repoRoot;
  const gitPath = path.join(repoRoot, '.git');
  try {
    const gitStats = await fs.stat(gitPath);
    if (gitStats.isFile()) {
      // This is a worktree - .git is a file pointing to main repo's .git/worktrees/<name>
      const gitContent = await fs.readFile(gitPath, 'utf-8');
      const match = gitContent.match(/gitdir:\s*(.+)/);
      if (match && match[1]) {
        // Extract main repo from gitdir path (e.g., /path/to/main/.git/worktrees/feature-branch)
        const gitDir = match[1].trim();
        // Navigate up from .git/worktrees/xxx to get main repo root
        // The path pattern is: <main-repo>/.git/worktrees/<worktree-name>
        const worktreesDir = path.dirname(gitDir); // .git/worktrees
        const gitDirPath = path.dirname(worktreesDir); // .git
        mainRepoRoot = path.dirname(gitDirPath); // main repo root
      }
    }
  } catch {
    // If .git doesn't exist or can't be read, use repoRoot as-is
  }

  const symlinkPath = path.join(mainRepoRoot, '.speck', 'root');

  // First check if symlink exists at all
  let symlinkExists = false;
  let isSymlink = false;
  try {
    const stats = await fs.lstat(symlinkPath);
    symlinkExists = true;
    isSymlink = stats.isSymbolicLink();
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== 'ENOENT') {
      throw error; // Unexpected error
    }
    // Symlink doesn't exist - will check for multi-repo root below
  }

  // If .speck/root exists but isn't a symlink
  if (symlinkExists && !isSymlink) {
    console.warn(
      'WARNING: .speck/root exists but is not a symlink\n' +
      'Expected: symlink to speck root directory\n' +
      'Found: regular file/directory\n' +
      'Falling back to single-repo mode.\n' +
      'To enable multi-repo: mv .speck/root .speck/root.backup && /speck:link <path>'
    );
    const config: SpeckConfig = {
      mode: 'single-repo',
      speckRoot: repoRoot,
      repoRoot,
      specsDir: path.join(repoRoot, 'specs')
    };
    cachedConfig = config;
    return config;
  }

  // If symlink exists, try to resolve it
  if (symlinkExists && isSymlink) {
    try {
      // Resolve symlink to absolute path
      const speckRoot = await fs.realpath(symlinkPath);

      // T094 - Security: Validate symlink target doesn't escape to sensitive paths
      // Reject paths that point to system directories or parent of home
      const dangerousPaths = ['/', '/etc', '/usr', '/bin', '/sbin', '/System', '/Library'];
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      if (dangerousPaths.some(dangerous => speckRoot === dangerous || speckRoot.startsWith(dangerous + '/'))) {
        throw new Error(
          `Security: .speck/root symlink points to system directory: ${speckRoot}\n` +
          'Speck root must be a user-owned project directory.\n' +
          'Fix: rm .speck/root && /speck:link <safe-project-path>'
        );
      }
      if (homeDir && speckRoot === path.dirname(homeDir)) {
        throw new Error(
          `Security: .speck/root symlink points above home directory: ${speckRoot}\n` +
          'Fix: rm .speck/root && /speck:link <project-path-within-home>'
        );
      }

      // Verify target exists
      await fs.access(speckRoot);

      const config: SpeckConfig = {
        mode: 'multi-repo',
        speckRoot,
        repoRoot,
        specsDir: path.join(speckRoot, 'specs')
      };
      cachedConfig = config;
      return config;

    } catch (error) {
      const err = error as NodeJS.ErrnoException;

      if (err.code === 'ELOOP') {
        throw new Error(
          'Multi-repo configuration broken: .speck/root contains circular reference\n' +
          'Fix: rm .speck/root && /speck:link <valid-path>'
        );
      }

      if (err.code === 'ENOENT') {
        // Broken symlink - target does not exist
        const target = await fs.readlink(symlinkPath).catch(() => 'unknown');
        throw new Error(
          `Multi-repo configuration broken: .speck/root → ${target} (does not exist)\n` +
          'Fix:\n' +
          '  1. Remove broken symlink: rm .speck/root\n' +
          '  2. Link to correct location: /speck:link <path-to-speck-root>'
        );
      }

      // Re-throw other errors
      throw error;
    }
  }

  // No symlink - check if this is a multi-repo root
  // Multi-repo root has .speck-link-* symlinks pointing to child repos
  const childRepos = await findChildRepos(repoRoot);

  if (childRepos.length > 0) {
    // This is a multi-repo root (has child repos linked)
    const config: SpeckConfig = {
      mode: 'multi-repo',
      speckRoot: repoRoot,
      repoRoot,
      specsDir: path.join(repoRoot, 'specs')
    };
    cachedConfig = config;
    return config;
  }

  // No child repos found - truly single-repo mode
  const config: SpeckConfig = {
    mode: 'single-repo',
    speckRoot: repoRoot,
    repoRoot,
    specsDir: path.join(repoRoot, 'specs')
  };
  cachedConfig = config;
  return config;
}

/**
 * Backward compatibility alias for detectSpeckRoot
 * @deprecated Use detectSpeckRoot() instead
 */
export const detectSpeckMode = detectSpeckRoot;

/**
 * T006 - Check if current repository is a multi-repo child (Feature 009)
 *
 * @returns true if in multi-repo mode and current repo is NOT the speck root
 */
export async function isMultiRepoChild(): Promise<boolean> {
  const config = await detectSpeckRoot();
  return config.mode === 'multi-repo' && config.repoRoot !== config.speckRoot;
}

/**
 * T007 - Get child repository name (Feature 009)
 *
 * Extracts the child repo name from the .speck-link-* symlink in the speck root.
 * Falls back to basename if no symlink found (e.g., in single-repo mode).
 *
 * @param repoRoot - Child repository root path
 * @param speckRoot - Speck root path
 * @returns Directory name of child repo (from symlink name or basename)
 */
export async function getChildRepoName(repoRoot: string, speckRoot: string): Promise<string> {
  try {
    // Resolve repoRoot to absolute path for comparison
    const resolvedRepoRoot = await fs.realpath(repoRoot);

    // Scan speck root for .speck-link-* symlinks
    const entries = await fs.readdir(speckRoot, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isSymbolicLink() && entry.name.startsWith('.speck-link-')) {
        const symlinkPath = path.join(speckRoot, entry.name);

        try {
          // Resolve symlink target
          const targetPath = await fs.realpath(symlinkPath);

          // If this symlink points to our repo, extract name from symlink
          if (targetPath === resolvedRepoRoot) {
            // Extract name from .speck-link-{name} pattern
            return entry.name.replace(/^\.speck-link-/, '');
          }
        } catch {
          // Broken symlink - skip
          continue;
        }
      }
    }
  } catch {
    // If lookup fails, fall back to basename
  }

  // Fallback: use directory basename (for single-repo mode or if symlink not found)
  return path.basename(repoRoot);
}

/**
 * T008 - Find all child repositories via symlinks (Feature 009)
 *
 * Scans speck root for .speck-link-* symlinks and returns child repo paths
 *
 * @param speckRoot - Speck root directory path
 * @returns Array of absolute paths to child repositories
 */
export async function findChildRepos(speckRoot: string): Promise<string[]> {
  const childRepos: string[] = [];

  try {
    const entries = await fs.readdir(speckRoot, { withFileTypes: true });

    for (const entry of entries) {
      // Look for symlinks matching .speck-link-* pattern
      if (entry.isSymbolicLink() && entry.name.startsWith('.speck-link-')) {
        const symlinkPath = path.join(speckRoot, entry.name);

        try {
          // Resolve symlink to absolute path
          const targetPath = await fs.realpath(symlinkPath);

          // T094 - Security: Validate child repo symlink doesn't point to dangerous paths
          const dangerousPaths = ['/', '/etc', '/usr', '/bin', '/sbin', '/System', '/Library'];
          if (dangerousPaths.some(dangerous => targetPath === dangerous || targetPath.startsWith(dangerous + '/'))) {
            console.warn(`Security: Skipping ${entry.name} - points to system directory: ${targetPath}`);
            continue;
          }

          // Verify target is a directory and has .git
          const gitDir = path.join(targetPath, '.git');
          try {
            await fs.access(gitDir);
            childRepos.push(targetPath);
          } catch {
            // Not a git repository - skip
            console.warn(`Warning: ${entry.name} points to non-git directory: ${targetPath}`);
          }
        } catch (error) {
          // Broken symlink - skip with warning
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`Warning: Broken symlink ${entry.name}: ${errorMessage}`);
        }
      }
    }
  } catch (error) {
    // If speckRoot doesn't exist or can't be read, return empty array
    const err = error as NodeJS.ErrnoException;
    if (err.code !== 'ENOENT') {
      throw error;
    }
  }

  return childRepos;
}

/**
 * T037 - Find child repositories with their logical names (Feature 009)
 *
 * Returns map of logical child repo name (from symlink) to repo path.
 * Used for aggregate status display with user-friendly names.
 *
 * @param speckRoot - Speck root directory path
 * @returns Map of child repo name → repo path
 *
 * @example
 * ```typescript
 * const children = await findChildReposWithNames("/path/to/root");
 * // Returns: Map { "backend-service" => "/tmp/backend-1234", "frontend-app" => "/tmp/frontend-5678" }
 * ```
 */
export async function findChildReposWithNames(speckRoot: string): Promise<Map<string, string>> {
  const childRepos = new Map<string, string>();

  try {
    const entries = await fs.readdir(speckRoot, { withFileTypes: true });

    for (const entry of entries) {
      // Look for symlinks matching .speck-link-* pattern
      if (entry.isSymbolicLink() && entry.name.startsWith('.speck-link-')) {
        const symlinkPath = path.join(speckRoot, entry.name);

        // Extract logical name from symlink: .speck-link-backend-service → backend-service
        const logicalName = entry.name.substring('.speck-link-'.length);

        try {
          // Resolve symlink to absolute path
          const targetPath = await fs.realpath(symlinkPath);

          // T094 - Security: Validate child repo symlink doesn't point to dangerous paths
          const dangerousPaths = ['/', '/etc', '/usr', '/bin', '/sbin', '/System', '/Library'];
          if (dangerousPaths.some(dangerous => targetPath === dangerous || targetPath.startsWith(dangerous + '/'))) {
            console.warn(`Security: Skipping ${entry.name} - points to system directory: ${targetPath}`);
            continue;
          }

          // Verify target is a directory and has .git
          const gitDir = path.join(targetPath, '.git');
          try {
            await fs.access(gitDir);
            childRepos.set(logicalName, targetPath);
          } catch {
            // Not a git repository - skip
            console.warn(`Warning: ${entry.name} points to non-git directory: ${targetPath}`);
          }
        } catch (error) {
          // Broken symlink - skip with warning
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`Warning: Broken symlink ${entry.name}: ${errorMessage}`);
        }
      }
    }
  } catch (error) {
    // If speckRoot doesn't exist or can't be read, return empty map
    const err = error as NodeJS.ErrnoException;
    if (err.code !== 'ENOENT') {
      throw error;
    }
  }

  return childRepos;
}

/**
 * T009 - Get multi-repo context metadata with context field (Feature 009)
 *
 * Extended version of detectSpeckRoot() that determines execution context
 *
 * @returns MultiRepoContextMetadata with context, parentSpecId, childRepoName
 */
export async function getMultiRepoContext(): Promise<MultiRepoContextMetadata> {
  const config = await detectSpeckRoot();

  // Single-repo mode
  if (config.mode === 'single-repo') {
    return {
      ...config,
      context: 'single',
      parentSpecId: null,
      childRepoName: null,
    };
  }

  // Multi-repo: determine if root or child
  if (config.repoRoot === config.speckRoot) {
    // Root context
    return {
      ...config,
      context: 'root',
      parentSpecId: null,
      childRepoName: null,
    };
  } else {
    // Child context - extract parentSpecId from branches.json
    const childRepoName = await getChildRepoName(config.repoRoot, config.speckRoot);

    // Try to determine parent spec by reading from branches.json
    let parentSpecId: string | null = null;
    try {
      const branchesJsonPath = path.join(config.repoRoot, '.speck', 'branches.json');
      const content = await fs.readFile(branchesJsonPath, 'utf-8');
      const branchMapping = JSON.parse(content) as { branches?: Array<{ parentSpecId?: string | null }> };

      // Get parentSpecId from the first branch entry (all branches in child repo should have same parentSpecId)
      if (branchMapping.branches && branchMapping.branches.length > 0) {
        parentSpecId = branchMapping.branches[0]?.parentSpecId || null;
      }
    } catch {
      // If we can't read branches.json or it doesn't exist, leave parentSpecId as null
    }

    // T108a - If no parentSpecId found in branches.json, detect from root repo's current branch
    if (!parentSpecId) {
      try {
        const { $ } = await import("bun");
        const result = await $`git -C ${config.speckRoot} rev-parse --abbrev-ref HEAD`.quiet();
        const currentBranch = result.stdout.toString().trim();

        // Check if current branch matches spec pattern (NNN-feature-name)
        if (/^\d{3}-/.test(currentBranch)) {
          parentSpecId = currentBranch;
        }
      } catch {
        // Ignore errors - leave parentSpecId as null
      }
    }

    return {
      ...config,
      context: 'child',
      parentSpecId,
      childRepoName,
    };
  }
}
// [SPECK-EXTENSION:END]

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
          if (match && match[1]) {
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
    // Check for .git directory first (most reliable, especially in bundled contexts)
    const cwd = process.cwd();
    const gitDir = path.join(cwd, ".git");
    if (existsSync(gitDir)) {
      return true;
    }

    // Fall back to git command (handles worktrees and other edge cases)
    await $`git rev-parse --show-toplevel`.quiet();
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate branch name using git check-ref-format (T016)
 *
 * @param branchName - Branch name to validate
 * @returns true if valid git ref name, false otherwise
 */
export async function validateBranchName(branchName: string): Promise<boolean> {
  try {
    const result = await $`git check-ref-format --branch ${branchName}`.quiet();
    return result.exitCode === 0;
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
export async function checkFeatureBranch(branch: string, hasGitRepo: boolean, repoRoot: string): Promise<boolean> {
  // For non-git repos, we can't enforce branch naming
  if (!hasGitRepo) {
    console.error("[specify] Warning: Git repository not detected; skipped branch validation");
    return true;
  }

  // [STACKED-PR:START] T015 - Skip NNN-pattern enforcement if branches.json exists
  const branchesFile = path.join(repoRoot, ".speck", "branches.json");
  if (existsSync(branchesFile)) {
    try {
      const content = await fs.readFile(branchesFile, "utf-8");
      const mapping = JSON.parse(content) as BranchesMapping;

      // Check if current branch is in branches.json
      if (mapping.branches && Array.isArray(mapping.branches)) {
        const branchExists = mapping.branches.some((b) => b.name === branch);
        if (branchExists) {
          // Branch is in stacked mode - no NNN-pattern required
          return true;
        }
      }
    } catch {
      // If branches.json is malformed, fall through to traditional validation
    }
  }
  // [STACKED-PR:END]

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
 *
 * [SPECK-EXTENSION] Updated to accept specsDir parameter for multi-repo support
 * [STACKED-PR] T014 - Check branches.json first before falling back to numeric prefix
 */
export async function findFeatureDirByPrefix(specsDir: string, branchName: string, repoRoot: string): Promise<string> {
  // [STACKED-PR:START] T014 - Check branches.json first
  const branchesFile = path.join(repoRoot, ".speck", "branches.json");
  if (existsSync(branchesFile)) {
    try {
      const content = await fs.readFile(branchesFile, "utf-8");
      const mapping = JSON.parse(content) as BranchesMapping;

      // Find branch in mapping
      if (mapping.branches && Array.isArray(mapping.branches)) {
        const branch = mapping.branches.find((b) => b.name === branchName);
        if (branch && branch.specId) {
          // Found in branches.json - use specId
          return path.join(specsDir, branch.specId);
        }
      }
    } catch {
      // If branches.json is malformed, fall through to traditional lookup
    }
  }
  // [STACKED-PR:END]

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
  } else if (matches.length === 1 && matches[0]) {
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
 *
 * [SPECK-EXTENSION] Updated to use detectSpeckRoot() for multi-repo support
 */
export async function getFeaturePaths(): Promise<FeaturePaths> {
  // [SPECK-EXTENSION:START] Multi-repo path resolution
  const config = await detectSpeckRoot();
  const currentBranch = await getCurrentBranch(config.repoRoot);
  const hasGitRepo = await hasGit();

  // Use prefix-based lookup to support multiple branches per spec
  const featureDir = await findFeatureDirByPrefix(config.specsDir, currentBranch, config.repoRoot);
  const featureName = path.basename(featureDir);

  // Local specs directory for implementation artifacts
  const localSpecsDir = path.join(config.repoRoot, "specs", featureName);

  return {
    MODE: config.mode,
    SPECK_ROOT: config.speckRoot,
    SPECS_DIR: config.specsDir,
    REPO_ROOT: config.repoRoot,
    CURRENT_BRANCH: currentBranch,
    HAS_GIT: hasGitRepo ? "true" : "false",
    FEATURE_DIR: featureDir,
    FEATURE_SPEC: path.join(featureDir, "spec.md"),  // Shared (root repo)
    CHECKLISTS_DIR: path.join(featureDir, "checklists"),  // Shared (root repo)
    LINKED_REPOS: path.join(featureDir, "linked-repos.md"),  // Shared (root repo)
    IMPL_PLAN: path.join(localSpecsDir, "plan.md"),  // Local (child repo)
    TASKS: path.join(localSpecsDir, "tasks.md"),  // Local (child repo)
    RESEARCH: path.join(localSpecsDir, "research.md"),  // Local (child repo)
    DATA_MODEL: path.join(localSpecsDir, "data-model.md"),  // Local (child repo)
    QUICKSTART: path.join(localSpecsDir, "quickstart.md"),  // Local (child repo)
    CONTRACTS_DIR: path.join(featureDir, "contracts"),  // Shared (root repo) - API contracts shared across repos
  };
  // [SPECK-EXTENSION:END]
}

/**
 * Read workflow mode from constitution.md
 *
 * Searches for: **Default Workflow Mode**: stacked-pr | single-branch
 *
 * @returns "stacked-pr" | "single-branch" | null (if not found)
 */
export async function getDefaultWorkflowMode(): Promise<"stacked-pr" | "single-branch" | null> {
  try {
    // Use getRepoRoot instead of detectSpeckRoot to avoid cache issues in tests
    // The constitution file is always at repoRoot/.speck/memory/constitution.md
    const repoRoot = await getRepoRoot();
    const constitutionPath = path.join(repoRoot, ".speck/memory/constitution.md");

    if (!existsSync(constitutionPath)) {
      return null;
    }

    const content = await fs.readFile(constitutionPath, "utf-8");

    // Search for: **Default Workflow Mode**: stacked-pr
    // or: **Default Workflow Mode**: single-branch
    const match = content.match(/^\*\*Default Workflow Mode\*\*:\s*(stacked-pr|single-branch)\s*$/m);

    if (match && (match[1] === "stacked-pr" || match[1] === "single-branch")) {
      return match[1];
    }

    return null;
  } catch (error) {
    // If file read fails or parsing errors, return null (graceful degradation)
    return null;
  }
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

// [SPECK-EXTENSION:START] T069: Utility to sync contracts/ from shared to local
/**
 * Sync shared contracts/ directory to local repo via symlink
 *
 * In multi-repo mode with shared specs, this creates a symlink from
 * local specs/NNN-feature/contracts/ to shared speckRoot/specs/NNN-feature/contracts/
 *
 * @param featureName - Feature directory name (e.g., "007-multi-repo-support")
 * @returns true if symlink created/already exists, false if not needed
 */
export async function syncSharedContracts(featureName: string): Promise<boolean> {
  const config = await detectSpeckRoot();

  // Only applies to multi-repo mode
  if (config.mode !== 'multi-repo') {
    return false;
  }

  // Check if shared contracts/ exists
  const sharedContractsDir = path.join(config.speckRoot, 'specs', featureName, 'contracts');
  if (!existsSync(sharedContractsDir)) {
    return false;
  }

  // Create local feature directory if it doesn't exist
  const localFeatureDir = path.join(config.repoRoot, 'specs', featureName);
  if (!existsSync(localFeatureDir)) {
    return false; // Feature dir doesn't exist locally yet
  }

  const localContractsLink = path.join(localFeatureDir, 'contracts');

  // Check if symlink already exists
  try {
    const stats = await fs.lstat(localContractsLink);
    if (stats.isSymbolicLink()) {
      // Verify it points to the right location
      const resolved = await fs.realpath(localContractsLink);
      if (resolved === sharedContractsDir) {
        return true; // Already correctly linked
      }
      // Pointing to wrong location - remove and recreate
      await fs.unlink(localContractsLink);
    } else {
      // Exists but not a symlink - warn and don't overwrite
      console.warn(
        `WARNING: Local contracts/ directory exists but is not a symlink\n` +
        `  Local: ${localContractsLink}\n` +
        `  Shared: ${sharedContractsDir}\n` +
        `  Skipping symlink creation to preserve local data.`
      );
      return false;
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== 'ENOENT') throw error;
    // Symlink doesn't exist - we'll create it
  }

  // Calculate relative path for symlink
  const relativePath = path.relative(localFeatureDir, sharedContractsDir);

  // Create symlink
  try {
    await fs.symlink(relativePath, localContractsLink, 'dir');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: Failed to create contracts/ symlink: ${errorMessage}`);
    return false;
  }
}
// [SPECK-EXTENSION:END]
