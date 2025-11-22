/**
 * Symlink Manager
 *
 * Manages the upstream/latest symlink that points to the most recent release.
 */

import { lstatSync, unlinkSync, symlinkSync, readlinkSync } from "fs";

/**
 * Symlink manager error
 */
export class SymlinkManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SymlinkManagerError";
  }
}

/**
 * Create a symlink pointing to target
 *
 * @param target - The path the symlink should point to (e.g., "v1.0.0")
 * @param linkPath - The symlink path (e.g., "upstream/latest")
 *
 * @throws SymlinkManagerError if symlink already exists or creation fails
 *
 * @example
 * ```typescript
 * await createSymlink("v1.0.0", "upstream/latest");
 * // Creates: upstream/latest -> v1.0.0
 * ```
 */
export function createSymlink(
  target: string,
  linkPath: string
): void {
  try {
    // Use lstatSync to check for symlink existence (existsSync returns false for broken symlinks)
    try {
      lstatSync(linkPath);
      throw new SymlinkManagerError(
        `Symlink already exists at ${linkPath}. Use updateSymlink() to replace.`
      );
    } catch (error) {
      if (error instanceof SymlinkManagerError) {
        throw error;
      }
      // ENOENT means path doesn't exist, which is what we want
      const err = error as NodeJS.ErrnoException;
      if (err.code !== "ENOENT") {
        throw error;
      }
    }

    // On Unix-like systems, symlink type is ignored, so we can just omit it
    symlinkSync(target, linkPath);
  } catch (error) {
    if (error instanceof SymlinkManagerError) {
      throw error;
    }
    throw new SymlinkManagerError(
      `Failed to create symlink: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Update an existing symlink or create if it doesn't exist
 *
 * @param target - The new target path (e.g., "v1.1.0")
 * @param linkPath - The symlink path (e.g., "upstream/latest")
 *
 * @example
 * ```typescript
 * await updateSymlink("v1.1.0", "upstream/latest");
 * // Updates: upstream/latest -> v1.1.0
 * ```
 */
export function updateSymlink(
  target: string,
  linkPath: string
): void {
  try {
    // Remove existing symlink if it exists (use lstatSync for broken symlinks)
    try {
      const stats = lstatSync(linkPath);
      if (stats.isSymbolicLink()) {
        unlinkSync(linkPath);
      } else {
        throw new SymlinkManagerError(
          `Path ${linkPath} exists but is not a symlink`
        );
      }
    } catch (error) {
      if (error instanceof SymlinkManagerError) {
        throw error;
      }
      // ENOENT means path doesn't exist, which is fine for update
      const err = error as NodeJS.ErrnoException;
      if (err.code !== "ENOENT") {
        throw error;
      }
    }

    // Create new symlink (type is ignored on Unix-like systems)
    symlinkSync(target, linkPath);
  } catch (error) {
    if (error instanceof SymlinkManagerError) {
      throw error;
    }
    throw new SymlinkManagerError(
      `Failed to update symlink: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Read the target of a symlink
 *
 * @param linkPath - The symlink path
 * @returns The target path the symlink points to
 *
 * @throws SymlinkManagerError if path is not a symlink
 *
 * @example
 * ```typescript
 * const target = await readSymlink("upstream/latest");
 * console.log(target); // "v1.0.0"
 * ```
 */
export function readSymlink(linkPath: string): string {
  try {
    // Use lstatSync to check for symlink (existsSync returns false for broken symlinks)
    const stats = lstatSync(linkPath);
    if (!stats.isSymbolicLink()) {
      throw new SymlinkManagerError(
        `Path ${linkPath} exists but is not a symlink`
      );
    }

    return readlinkSync(linkPath);
  } catch (error) {
    if (error instanceof SymlinkManagerError) {
      throw error;
    }
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      throw new SymlinkManagerError(`Symlink not found: ${linkPath}`);
    }
    throw new SymlinkManagerError(
      `Failed to read symlink: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Check if a path is a symlink
 *
 * @param linkPath - Path to check
 * @returns true if path is a symlink, false otherwise
 */
export function isSymlink(linkPath: string): boolean {
  try {
    // Use lstatSync to check for symlink (existsSync returns false for broken symlinks)
    const stats = lstatSync(linkPath);
    return stats.isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Remove a symlink
 *
 * @param linkPath - The symlink path to remove
 *
 * @throws SymlinkManagerError if path is not a symlink or removal fails
 *
 * @example
 * ```typescript
 * await removeSymlink("upstream/latest");
 * ```
 */
export function removeSymlink(linkPath: string): void {
  try {
    // Use lstatSync to check for symlink (existsSync returns false for broken symlinks)
    const stats = lstatSync(linkPath);
    if (!stats.isSymbolicLink()) {
      throw new SymlinkManagerError(
        `Path ${linkPath} exists but is not a symlink`
      );
    }

    unlinkSync(linkPath);
  } catch (error) {
    if (error instanceof SymlinkManagerError) {
      throw error;
    }
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      throw new SymlinkManagerError(`Symlink not found: ${linkPath}`);
    }
    throw new SymlinkManagerError(
      `Failed to remove symlink: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
