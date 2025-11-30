/**
 * Worktree Workflows
 *
 * This module provides high-level workflows that combine worktree operations
 * with user interactions and branch management.
 */

import prompts from "prompts";
import { createWorktree } from "./create";
import { loadConfig } from "./config";
import { constructBranchName } from "./naming";
import { isValidBranchName } from "./validation";
import type { CreateWorktreeOptions } from "./types";

/**
 * Create a branch with worktree, with optional user approval prompt
 *
 * This workflow:
 * 1. Constructs the full branch name with prefix
 * 2. Optionally prompts user for approval (FR-016)
 * 3. Creates the worktree
 *
 * @param repoPath - Absolute path to repository root
 * @param branchName - Base branch name (e.g., "012-worktree")
 * @param promptForApproval - If true, ask user to approve branch name
 * @param options - Additional worktree creation options
 * @returns Worktree creation result
 */
export async function createBranchWithWorktree(
  repoPath: string,
  branchName: string,
  promptForApproval: boolean = false,
  options: Partial<CreateWorktreeOptions> = {}
): Promise<{
  approved: boolean;
  branchName: string;
  worktreePath?: string;
}> {
  // Load config to get branch prefix
  const config = await loadConfig(repoPath);
  const branchPrefix = config.worktree.branchPrefix;

  // Construct full branch name
  const fullBranchName = constructBranchName(branchName, branchPrefix);

  // Validate branch name
  if (!isValidBranchName(fullBranchName)) {
    throw new Error(
      `Invalid branch name: '${fullBranchName}'. Branch names cannot contain spaces, special characters, or start with a dash.`
    );
  }

  // Prompt for approval if requested (T028)
  if (promptForApproval) {
    const response = await prompts({
      type: "confirm",
      name: "approved",
      message: `Create worktree for branch '${fullBranchName}'?`,
      initial: true,
    });

    if (!response.approved) {
      return {
        approved: false,
        branchName: fullBranchName,
      };
    }
  }

  // Create worktree
  const result = await createWorktree({
    repoPath,
    branchName,
    branchPrefix,
    ...options,
  });

  return {
    approved: true,
    branchName: fullBranchName,
    worktreePath: result.worktreePath,
  };
}

/**
 * Interactive worktree creation workflow
 *
 * Prompts user for all options and creates worktree
 *
 * @param repoPath - Absolute path to repository root
 * @returns Worktree creation result or null if cancelled
 */
export async function interactiveCreateWorktree(
  repoPath: string
): Promise<{ branchName: string; worktreePath: string } | null> {
  const config = await loadConfig(repoPath);

  // Prompt for branch name
  const branchResponse = await prompts({
    type: "text",
    name: "branchName",
    message: "Branch name:",
    validate: (value: string) =>
      isValidBranchName(value) || "Invalid branch name format",
  });

  const branchName = branchResponse.branchName as string | undefined;

  if (!branchName) {
    return null; // User cancelled
  }

  // Construct full branch name with prefix
  const fullBranchName = constructBranchName(
    branchName,
    config.worktree.branchPrefix
  );

  // Confirm creation
  const confirmResponse = await prompts({
    type: "confirm",
    name: "confirmed",
    message: `Create worktree for '${fullBranchName}'?`,
    initial: true,
  });

  const confirmed = confirmResponse.confirmed as boolean | undefined;

  if (!confirmed) {
    return null;
  }

  // Create worktree
  const result = await createWorktree({
    repoPath,
    branchName,
    branchPrefix: config.worktree.branchPrefix,
  });

  return {
    branchName: fullBranchName,
    worktreePath: result.worktreePath,
  };
}
