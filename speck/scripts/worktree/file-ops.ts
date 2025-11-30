/**
 * File Operations for Worktree Integration
 *
 * Handles file copy/symlink operations for worktree setup
 */

import { mkdir, copyFile, symlink, access } from "node:fs/promises";
import { join, relative, dirname } from "node:path";
import { constants } from "node:fs";
import { Glob } from "bun";
import { $ } from "bun";
import type { FileRule } from "./config-schema";

/**
 * Default file rules for worktree setup
 *
 * Based on plan.md recommendations:
 * - Copy config files that should be independent per worktree
 * - Symlink large directories that should be shared
 * - Ignore build artifacts and logs
 */
export const DEFAULT_FILE_RULES: FileRule[] = [
  // Configuration files (copy for independence)
  { pattern: "package.json", action: "copy" },
  { pattern: "package-lock.json", action: "copy" },
  { pattern: "yarn.lock", action: "copy" },
  { pattern: "pnpm-lock.yaml", action: "copy" },
  { pattern: "bun.lockb", action: "copy" },
  { pattern: "*.config.js", action: "copy" },
  { pattern: "*.config.ts", action: "copy" },
  { pattern: "tsconfig.json", action: "copy" },
  { pattern: ".gitignore", action: "copy" },
  { pattern: ".env.example", action: "copy" },

  // Dependencies (symlink for disk space efficiency)
  { pattern: "node_modules", action: "symlink" },
  { pattern: ".git", action: "symlink" },

  // Build artifacts (ignore)
  { pattern: "dist/**", action: "ignore" },
  { pattern: "build/**", action: "ignore" },
  { pattern: "*.log", action: "ignore" },
  { pattern: ".DS_Store", action: "ignore" },
];

/**
 * Options for file operations
 */
export interface ApplyFileRulesOptions {
  sourcePath: string;         // Absolute path to source (main repo)
  destPath: string;           // Absolute path to destination (worktree)
  rules: FileRule[];          // File rules to apply
  includeUntracked?: boolean; // Include untracked files in copy operations
  onProgress?: (message: string) => void; // Progress callback
}

/**
 * Result of file operations
 */
export interface ApplyFileRulesResult {
  copiedCount: number;        // Number of files copied
  copiedPaths: string[];      // Relative paths of copied files
  symlinkedCount: number;     // Number of directories symlinked
  symlinkedPaths: string[];   // Relative paths of symlinked directories
  errors: Array<{             // Non-fatal errors
    path: string;
    error: string;
  }>;
}

/**
 * Get git-tracked files from repository
 *
 * @param repoPath - Absolute path to repository
 * @returns Array of relative paths to tracked files
 */
async function getTrackedFiles(repoPath: string): Promise<string[]> {
  try {
    // Use git ls-files to get tracked files
    const result = await $`cd ${repoPath} && git ls-files`.text();

    if (!result || result.trim() === "") {
      return [];
    }

    return result.trim().split("\n").filter(line => line.trim() !== "");
  } catch (error) {
    // If git command fails, return empty array
    return [];
  }
}

/**
 * Match files against glob patterns
 *
 * Only matches git-tracked files (use includeUntracked option in applyFileRules for untracked files)
 *
 * @param basePath - Absolute path to search in
 * @param patterns - Array of glob patterns
 * @returns Array of relative paths matching patterns
 */
export async function matchFiles(
  basePath: string,
  patterns: string[]
): Promise<string[]> {
  if (patterns.length === 0) {
    return [];
  }

  // Get tracked files from git
  const trackedFiles = await getTrackedFiles(basePath);
  const allMatches = new Set<string>();

  for (const pattern of patterns) {
    const glob = new Glob(pattern);

    // Match pattern against tracked files only
    for (const file of trackedFiles) {
      if (glob.match(file)) {
        allMatches.add(file);
      }
    }
  }

  return Array.from(allMatches).sort();
}

/**
 * Get untracked files from git
 *
 * @param repoPath - Absolute path to repository
 * @returns Array of relative paths to untracked files
 */
export async function getUntrackedFiles(repoPath: string): Promise<string[]> {
  try {
    // Use git ls-files to get untracked files
    const result = await $`cd ${repoPath} && git ls-files --others --exclude-standard`.text();

    if (!result || result.trim() === "") {
      return [];
    }

    return result.trim().split("\n").filter(line => line.trim() !== "");
  } catch (error) {
    // If git command fails, return empty array
    return [];
  }
}

/**
 * Copy files from source to destination
 *
 * @param sourcePath - Absolute path to source directory
 * @param destPath - Absolute path to destination directory
 * @param files - Array of relative file paths to copy
 * @param concurrency - Number of concurrent copy operations
 */
export async function copyFiles(
  sourcePath: string,
  destPath: string,
  files: string[],
  concurrency: number = 10
): Promise<void> {
  if (files.length === 0) {
    return;
  }

  // Process files in batches for concurrency control
  const batches: string[][] = [];
  for (let i = 0; i < files.length; i += concurrency) {
    batches.push(files.slice(i, i + concurrency));
  }

  for (const batch of batches) {
    await Promise.all(
      batch.map(async (file) => {
        const sourceFile = join(sourcePath, file);
        const destFile = join(destPath, file);

        // Create parent directory if it doesn't exist
        await mkdir(dirname(destFile), { recursive: true });

        // Copy file
        await copyFile(sourceFile, destFile);
      })
    );
  }
}

/**
 * Create symlinks for directories
 *
 * Uses relative symlink paths for portability
 *
 * @param sourcePath - Absolute path to source directory
 * @param destPath - Absolute path to destination directory
 * @param directories - Array of relative directory paths to symlink
 */
export async function symlinkDirectories(
  sourcePath: string,
  destPath: string,
  directories: string[]
): Promise<void> {
  if (directories.length === 0) {
    return;
  }

  for (const dir of directories) {
    const sourceDir = join(sourcePath, dir);
    const destDir = join(destPath, dir);

    // Create parent directory if needed
    await mkdir(dirname(destDir), { recursive: true });

    // Calculate relative path from destDir to sourceDir
    const relativePath = relative(dirname(destDir), sourceDir);

    // Create symlink
    await symlink(relativePath, destDir, "dir");
  }
}

/**
 * Apply file copy/symlink rules to worktree
 *
 * This function:
 * 1. Matches files using glob patterns
 * 2. Copies files matching { action: "copy" } rules
 * 3. Symlinks directories matching { action: "symlink" } rules
 * 4. Skips files matching { action: "ignore" } rules
 * 5. Includes untracked files if includeUntracked=true
 *
 * @param options - File operation options
 * @returns Result of file operations
 */
export async function applyFileRules(
  options: ApplyFileRulesOptions
): Promise<ApplyFileRulesResult> {
  const {
    sourcePath,
    destPath,
    rules,
    includeUntracked = false,
    onProgress
  } = options;

  const result: ApplyFileRulesResult = {
    copiedCount: 0,
    copiedPaths: [],
    symlinkedCount: 0,
    symlinkedPaths: [],
    errors: []
  };

  if (rules.length === 0) {
    return result;
  }

  // Separate rules by action
  const copyRules = rules.filter(r => r.action === "copy");
  const symlinkRules = rules.filter(r => r.action === "symlink");
  const ignoreRules = rules.filter(r => r.action === "ignore");

  // Get untracked files if needed
  let untrackedFiles: string[] = [];
  if (includeUntracked) {
    untrackedFiles = await getUntrackedFiles(sourcePath);
  }

  // Process copy rules
  if (copyRules.length > 0) {
    onProgress?.("Matching files to copy...");

    const copyPatterns = copyRules.map(r => r.pattern);
    const matchedFiles = await matchFiles(sourcePath, copyPatterns);

    // Filter out ignored patterns
    const ignorePatterns = ignoreRules.map(r => r.pattern);
    const filesToCopy = matchedFiles.filter(file => {
      // Check if file matches any ignore pattern
      for (const pattern of ignorePatterns) {
        const glob = new Glob(pattern);
        if (glob.match(file)) {
          return false;
        }
      }
      return true;
    });

    // Add untracked files if enabled
    if (includeUntracked && untrackedFiles.length > 0) {
      for (const untrackedFile of untrackedFiles) {
        // Check if untracked file matches copy patterns
        let matches = false;
        for (const pattern of copyPatterns) {
          const glob = new Glob(pattern);
          if (glob.match(untrackedFile)) {
            matches = true;
            break;
          }
        }

        // Check if untracked file matches ignore patterns
        let ignored = false;
        for (const pattern of ignorePatterns) {
          const glob = new Glob(pattern);
          if (glob.match(untrackedFile)) {
            ignored = true;
            break;
          }
        }

        if (matches && !ignored && !filesToCopy.includes(untrackedFile)) {
          filesToCopy.push(untrackedFile);
        }
      }
    }

    if (filesToCopy.length > 0) {
      onProgress?.(`Copying ${filesToCopy.length} files...`);

      try {
        await copyFiles(sourcePath, destPath, filesToCopy);
        result.copiedCount = filesToCopy.length;
        result.copiedPaths = filesToCopy;
      } catch (error) {
        result.errors.push({
          path: "copy-operation",
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  // Process symlink rules
  if (symlinkRules.length > 0) {
    onProgress?.("Creating symlinks...");

    for (const rule of symlinkRules) {
      try {
        // Check if source directory exists
        const sourceDir = join(sourcePath, rule.pattern);

        try {
          await access(sourceDir, constants.F_OK);
        } catch {
          // Skip non-existent directories silently (not an error)
          continue;
        }

        // For symlinks, pattern is typically a directory name
        const directories = [rule.pattern];

        await symlinkDirectories(sourcePath, destPath, directories);
        result.symlinkedCount += directories.length;
        result.symlinkedPaths.push(...directories);
      } catch (error) {
        result.errors.push({
          path: rule.pattern,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  onProgress?.("File operations complete");

  return result;
}