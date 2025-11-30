/**
 * Dependency Installation for Worktree Integration
 *
 * Handles package manager detection and dependency installation
 */

import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import type { PackageManager } from "./config-schema";

/**
 * Options for dependency installation
 */
export interface InstallDependenciesOptions {
  worktreePath: string;       // Absolute path to worktree
  packageManager?: PackageManager; // Override detected package manager
  onProgress?: (line: string) => void; // Progress callback (stdout/stderr)
}

/**
 * Result of dependency installation
 */
export interface InstallDependenciesResult {
  success: boolean;
  packageManager: PackageManager; // Package manager that was used
  duration?: number;           // Installation time in milliseconds
  error?: string;             // Error message if failed
  interpretation?: string;    // User-friendly error interpretation
}

/**
 * Detect package manager from lockfiles
 *
 * Priority order: bun.lockb → pnpm-lock.yaml → yarn.lock → package-lock.json → npm
 *
 * @param projectPath - Absolute path to project directory
 * @returns Detected package manager
 */
export async function detectPackageManager(
  projectPath: string
): Promise<PackageManager> {
  const lockfiles: Array<[string, PackageManager]> = [
    ["bun.lockb", "bun"],
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["package-lock.json", "npm"],
  ];

  for (const [lockfile, pm] of lockfiles) {
    try {
      await access(join(projectPath, lockfile), constants.F_OK);
      return pm;
    } catch {
      // File doesn't exist, continue
    }
  }

  // Default to npm if no lockfile found
  return "npm";
}

/**
 * Get install command for package manager
 *
 * @param packageManager - Package manager to use
 * @returns Array of command and args (e.g., ["npm", "install"])
 */
export function getInstallCommand(packageManager: PackageManager): string[] {
  switch (packageManager) {
    case "bun":
      return ["bun", "install"];
    case "pnpm":
      return ["pnpm", "install"];
    case "yarn":
      return ["yarn", "install"];
    case "npm":
      return ["npm", "install"];
    case "auto":
      // Auto defaults to npm (actual detection happens in installDependencies)
      return ["npm", "install"];
  }
}

/**
 * Interpret installation error and provide actionable message
 *
 * @param error - Error output from package manager
 * @returns User-friendly error message with suggestions
 */
export function interpretInstallError(error: string): string {
  const errorLower = error.toLowerCase();

  if (errorLower.includes("enoent") && errorLower.includes("package.json")) {
    return "package.json not found. Ensure the file exists in the worktree directory.";
  }

  if (errorLower.includes("eacces") || errorLower.includes("permission denied")) {
    return "Permission denied. Try running with appropriate permissions or check file ownership.";
  }

  if (errorLower.includes("enospc") || errorLower.includes("no space")) {
    return "Insufficient disk space. Free up disk space and try again.";
  }

  if (errorLower.includes("network") || errorLower.includes("timeout") || errorLower.includes("fetch")) {
    return "Network error. Check your internet connection and try again.";
  }

  if (errorLower.includes("404") || errorLower.includes("not found")) {
    return "Package not found in registry. Verify package names in package.json.";
  }

  if (errorLower.includes("unexpected") && errorLower.includes("json")) {
    return "Invalid JSON in package.json. Check syntax and formatting.";
  }

  // Generic error message
  return "Dependency installation failed. Check the error message above for details.";
}

/**
 * Install dependencies in worktree
 *
 * This function:
 * 1. Detects package manager (or uses provided)
 * 2. Runs appropriate install command
 * 3. Streams output to progress callback
 * 4. Returns result with success status
 *
 * @param options - Installation options
 * @returns Result of installation
 */
export async function installDependencies(
  options: InstallDependenciesOptions
): Promise<InstallDependenciesResult> {
  const {
    worktreePath,
    packageManager: pmOverride,
    onProgress
  } = options;

  const startTime = Date.now();

  try {
    // Detect package manager if not provided or if "auto"
    const packageManager = (pmOverride === "auto" || !pmOverride)
      ? await detectPackageManager(worktreePath)
      : pmOverride;

    // Check if package.json exists
    try {
      await access(join(worktreePath, "package.json"), constants.F_OK);
    } catch {
      const error = "package.json not found";
      return {
        success: false,
        packageManager,
        error,
        interpretation: interpretInstallError(error)
      };
    }

    // Get install command
    const commandParts = getInstallCommand(packageManager);
    const command = commandParts[0];
    const args = commandParts.slice(1);

    if (!command) {
      throw new Error(`No command found for package manager: ${packageManager}`);
    }

    onProgress?.(`Installing dependencies with ${packageManager}...`);

    // Run install command
    return new Promise((resolve) => {
      const proc: ChildProcess = spawn(command, args, {
        cwd: worktreePath,
        stdio: ["ignore", "pipe", "pipe"],
        shell: true
      });

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (data: Buffer) => {
        const line = data.toString();
        stdout += line;
        onProgress?.(line.trim());
      });

      proc.stderr?.on("data", (data: Buffer) => {
        const line = data.toString();
        stderr += line;
        onProgress?.(line.trim());
      });

      proc.on("close", (code: number | null) => {
        const duration = Date.now() - startTime;

        if (code === 0) {
          resolve({
            success: true,
            packageManager,
            duration
          });
        } else {
          const error = stderr || stdout || `Installation failed with exit code ${code}`;
          resolve({
            success: false,
            packageManager,
            duration,
            error,
            interpretation: interpretInstallError(error)
          });
        }
      });

      proc.on("error", (err: Error) => {
        const duration = Date.now() - startTime;
        const error = err.message;

        resolve({
          success: false,
          packageManager,
          duration,
          error,
          interpretation: interpretInstallError(error)
        });
      });
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      packageManager: pmOverride || "npm",
      duration,
      error: errorMessage,
      interpretation: interpretInstallError(errorMessage)
    };
  }
}
