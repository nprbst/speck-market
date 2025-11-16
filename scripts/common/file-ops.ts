/**
 * Atomic File Operations
 *
 * Provides utilities for atomic file operations using temp directories
 * and atomic renames to ensure "all or nothing" transformations.
 */

import { mkdtemp, rm } from "fs/promises";
import { existsSync, renameSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

/**
 * Atomic file operations error
 */
export class AtomicFileOpsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AtomicFileOpsError";
  }
}

/**
 * Create a temporary directory with a given prefix
 *
 * @param prefix - Prefix for temp directory name (default: "speck-")
 * @returns Path to created temp directory
 *
 * @example
 * ```typescript
 * const tempDir = await createTempDir("speck-transform-");
 * console.log(tempDir); // "/tmp/speck-transform-abc123"
 * ```
 */
export async function createTempDir(prefix = "speck-"): Promise<string> {
  try {
    const tempDir = await mkdtemp(join(tmpdir(), prefix));
    return tempDir;
  } catch (error) {
    throw new AtomicFileOpsError(
      `Failed to create temp directory: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Remove a directory and all its contents
 *
 * @param dirPath - Path to directory to remove
 * @param force - Continue even if directory doesn't exist (default: true)
 *
 * @example
 * ```typescript
 * await removeDirectory("/tmp/speck-temp-abc123");
 * ```
 */
export async function removeDirectory(
  dirPath: string,
  force = true
): Promise<void> {
  try {
    await rm(dirPath, { recursive: true, force });
  } catch (error) {
    throw new AtomicFileOpsError(
      `Failed to remove directory: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Atomically move a directory using rename (POSIX atomic operation)
 *
 * @param sourcePath - Source directory path
 * @param destPath - Destination directory path
 * @param removeExisting - Remove existing destination if it exists (default: false)
 *
 * @throws AtomicFileOpsError if destination exists and removeExisting is false
 *
 * @example
 * ```typescript
 * await atomicMove("/tmp/speck-temp-abc123", ".speck/scripts");
 * ```
 */
export async function atomicMove(
  sourcePath: string,
  destPath: string,
  removeExisting = false
): Promise<void> {
  try {
    // Check if destination exists
    if (existsSync(destPath)) {
      if (!removeExisting) {
        throw new AtomicFileOpsError(
          `Destination already exists: ${destPath}. Set removeExisting=true to overwrite.`
        );
      }
      // Remove existing destination
      rmSync(destPath, { recursive: true, force: true });
    }

    // Atomic rename (POSIX guarantees atomicity)
    renameSync(sourcePath, destPath);
  } catch (error) {
    if (error instanceof AtomicFileOpsError) {
      throw error;
    }
    throw new AtomicFileOpsError(
      `Failed to move directory atomically: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Execute a function with automatic temp directory cleanup
 *
 * Creates a temp directory, passes it to the callback, and ensures cleanup
 * happens even if the callback throws an error.
 *
 * @param callback - Function to execute with temp directory
 * @param prefix - Temp directory prefix (default: "speck-")
 * @returns Result from callback function
 *
 * @example
 * ```typescript
 * const result = await withTempDir(async (tempDir) => {
 *   // Do work in tempDir
 *   await Bun.write(join(tempDir, "file.txt"), "content");
 *   return "success";
 * });
 * // tempDir is automatically cleaned up
 * console.log(result); // "success"
 * ```
 */
export async function withTempDir<T>(
  callback: (tempDir: string) => Promise<T>,
  prefix = "speck-"
): Promise<T> {
  const tempDir = await createTempDir(prefix);

  try {
    return await callback(tempDir);
  } finally {
    // Always cleanup temp directory
    await removeDirectory(tempDir, true);
  }
}

/**
 * Atomically write content to a file using temp file + rename
 *
 * Writes to a temporary file first, then atomically renames it to the target path.
 * This ensures the target file is never in a partial state.
 *
 * @param filePath - Target file path
 * @param content - Content to write (string, Buffer, or ArrayBuffer)
 *
 * @example
 * ```typescript
 * await atomicWrite("upstream/releases.json", JSON.stringify(registry, null, 2));
 * ```
 */
export async function atomicWrite(
  filePath: string,
  content: string | Buffer | ArrayBuffer
): Promise<void> {
  const tempPath = `${filePath}.tmp.${Date.now()}`;

  try {
    // Write to temp file
    await Bun.write(tempPath, content);

    // Atomic rename
    renameSync(tempPath, filePath);
  } catch (error) {
    // Cleanup temp file on error
    if (existsSync(tempPath)) {
      rmSync(tempPath, { force: true });
    }

    throw new AtomicFileOpsError(
      `Failed to write file atomically: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Copy directory contents recursively
 *
 * @param sourcePath - Source directory
 * @param destPath - Destination directory
 *
 * @example
 * ```typescript
 * await copyDirectory("upstream/v1.0.0", "/tmp/speck-temp");
 * ```
 */
export async function copyDirectory(
  sourcePath: string,
  destPath: string
): Promise<void> {
  try {
    // Use Bun Shell API for recursive copy
    const { $ } = await import("bun");
    await $`cp -r ${sourcePath} ${destPath}`.quiet();
  } catch (error) {
    throw new AtomicFileOpsError(
      `Failed to copy directory: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
