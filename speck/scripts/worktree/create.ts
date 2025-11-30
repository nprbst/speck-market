/**
 * Worktree Creation
 *
 * This module implements the main worktree creation workflow,
 * orchestrating Git operations, file setup, dependency installation, and IDE launch.
 */

import { loadConfig } from "./config";
import { constructWorktreePath, constructBranchName } from "./naming";
import { addWorktree, pruneWorktrees, getWorktreePath } from "./git";
import { checkWorktreePath, hasSufficientDiskSpace, branchExists } from "./validation";
import { GitWorktreeError, DiskSpaceError } from "./errors";
import { launchIDE } from "./ide-launch";
import { applyFileRules } from "./file-ops";
import { installDependencies } from "./deps-install";
import type {
  CreateWorktreeOptions,
  CreateWorktreeResult,
  WorktreeMetadata,
} from "./types";

/**
 * Create a Git worktree for a branch
 *
 * This is the main worktree creation function that orchestrates:
 * 1. Prune stale worktrees
 * 2. Validate disk space
 * 3. Handle existing directories (error or reuse)
 * 4. Git worktree add
 * 5. File copy/symlink operations (if configured)
 * 6. Dependency installation (if configured)
 * 7. IDE launch (if configured)
 *
 * @param options - Worktree creation options
 * @returns Result of creation operation
 * @throws Error if critical step fails (git add, file operations, deps)
 */
export async function createWorktree(
  options: CreateWorktreeOptions
): Promise<CreateWorktreeResult> {
  const {
    repoPath,
    branchName,
    branchPrefix,
    worktreePath: customWorktreePath,
    reuseExisting = false,
    force = false,
    skipDeps = false,
    skipIDE = false,
    onProgress,
  } = options;

  const errors: string[] = [];

  // Report progress
  const progress = (message: string, percent: number): void => {
    if (onProgress) {
      onProgress(message, percent);
    }
  };

  try {
    progress("Starting worktree creation...", 0);

    // Step 1: Cleanup stale worktrees (T023)
    progress("Cleaning up stale worktrees...", 5);
    await pruneWorktrees(repoPath);

    // Step 2: Load configuration
    progress("Loading configuration...", 10);
    const config = await loadConfig(repoPath);

    // Step 3: Construct paths
    progress("Determining worktree location...", 15);
    const fullBranchName = constructBranchName(branchName, branchPrefix);
    const worktreePath = customWorktreePath ||
      await constructWorktreePath(repoPath, config.worktree, branchName);

    // Step 4: Validate branch exists
    progress("Validating branch...", 20);
    const exists = await branchExists(repoPath, fullBranchName);
    if (!exists) {
      throw new GitWorktreeError(
        `Branch '${fullBranchName}' does not exist. Create it first with: git branch ${fullBranchName}`
      );
    }

    // Step 5: Check for existing worktree for this branch
    progress("Checking for existing worktree...", 25);
    const existingWorktree = await getWorktreePath(repoPath, fullBranchName);
    if (existingWorktree) {
      throw new GitWorktreeError(
        `Worktree already exists for branch '${fullBranchName}' at: ${existingWorktree}`
      );
    }

    // Step 6: Check disk space
    progress("Checking disk space...", 30);
    const hasSpace = await hasSufficientDiskSpace(worktreePath, 1000); // 1GB minimum
    if (!hasSpace) {
      throw new DiskSpaceError(
        "Insufficient disk space for worktree creation",
        1000,
        0 // We don't have the actual available space, but error will show the requirement
      );
    }

    // Step 7: Handle existing directory (T021 - collision detection)
    progress("Checking worktree path...", 35);
    const pathStatus = await checkWorktreePath(worktreePath);

    if (pathStatus === "exists") {
      if (force) {
        // Force flag: remove existing directory
        const { rm } = await import("fs/promises");
        await rm(worktreePath, { recursive: true, force: true });
        progress("Removed existing directory (force=true)...", 40);
      } else if (reuseExisting) {
        // Reuse flag: just warn and continue (T022)
        errors.push(`Directory already exists at ${worktreePath}, reusing it`);
        progress("Reusing existing directory...", 40);
      } else {
        // Neither flag: error
        throw new Error(
          `Directory already exists at ${worktreePath}. Use --reuse-worktree to reuse it or --force to remove it.`
        );
      }
    }

    // Step 8: Create Git worktree (T019 - basic createWorktree)
    progress(`Creating worktree for branch '${fullBranchName}'...`, 45);
    await addWorktree(repoPath, worktreePath, fullBranchName);
    progress("Worktree created successfully", 50);

    // Step 9: Apply file rules (T048 - integrate file operations into createWorktree)
    // Rules come from config (defaults are embedded in DEFAULT_WORKTREE_CONFIG)
    const fileRules = config.worktree.files.rules;

    if (fileRules.length > 0) {
      progress("Applying file rules...", 60);
      const fileResult = await applyFileRules({
        sourcePath: repoPath,
        destPath: worktreePath,
        rules: fileRules,
        includeUntracked: config.worktree.files.includeUntracked,
        onProgress: (message) => progress(message, 65)
      });

      // Report file operations results
      if (fileResult.copiedCount > 0) {
        progress(`Copied ${fileResult.copiedCount} files`, 70);
      }
      if (fileResult.symlinkedCount > 0) {
        progress(`Created ${fileResult.symlinkedCount} symlinks`, 75);
      }
      if (fileResult.errors.length > 0) {
        // File operation errors are non-fatal, add to errors array
        fileResult.errors.forEach(err => {
          errors.push(`File operation error (${err.path}): ${err.error}`);
        });
      }
    }

    // Step 10: Install dependencies (T057 - integrate dependency installation)
    if (config.worktree.dependencies.autoInstall && !skipDeps) {
      progress("Installing dependencies...", 80);
      const depsResult = await installDependencies({
        worktreePath,
        packageManager: config.worktree.dependencies.packageManager,
        onProgress: (line) => progress(line, 85)
      });

      if (depsResult.success) {
        progress(`Dependencies installed with ${depsResult.packageManager} in ${depsResult.duration}ms`, 88);
      } else {
        // Dependency installation failure is fatal (T062 - abort IDE launch, show error)
        throw new Error(
          `Dependency installation failed: ${depsResult.error}\n\nSuggestion: ${depsResult.interpretation}`
        );
      }
    }

    // Phase 4 (US2): Launch IDE (T037)
    if (config.worktree.ide.autoLaunch && !skipIDE) {
      progress("Launching IDE...", 90);
      try {
        const ideResult = launchIDE({
          worktreePath,
          editor: config.worktree.ide.editor,
          newWindow: config.worktree.ide.newWindow,
        });

        if (!ideResult.success) {
          // IDE launch failure is non-fatal (T041)
          errors.push(`IDE launch failed: ${ideResult.error}`);
        }
      } catch (error) {
        // IDE launch errors are non-fatal
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`IDE launch failed: ${errorMessage}`);
      }
    }

    progress("Worktree ready for use", 100);

    // Create metadata
    const metadata: WorktreeMetadata = {
      branchName: fullBranchName,
      worktreePath,
      createdAt: new Date().toISOString(),
      status: "ready",
      parentRepo: repoPath,
    };

    return {
      success: true,
      worktreePath,
      metadata,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    // Return failure result with error
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new GitWorktreeError(
      `Failed to create worktree: ${errorMessage}`,
      errorMessage
    );
  }
}
