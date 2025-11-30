/**
 * Staging Manager for Atomic Transform Rollback
 *
 * Manages staging lifecycle for transformation operations:
 * - Create isolated staging directories
 * - Track staging status and agent results
 * - Capture production baselines for conflict detection
 * - Atomic commit and rollback operations
 * - Orphaned staging detection and recovery
 */

import { existsSync, readdirSync } from 'node:fs';
import { mkdir, rm, stat, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { renameSync } from 'node:fs';
import {
  type StagingContext,
  type StagingMetadata,
  type StagedFile,
  type StagingStatus,
  type FileCategory,
  type ProductionBaseline,
  type FileBaseline,
  StagingMetadataSchema,
  PRODUCTION_DIRS,
  isTerminalStatus,
  isValidTransition,
} from './staging-types';

/**
 * Custom error for staging operations
 */
export class StagingError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'StagingError';
  }
}

/**
 * Staging root directory path constant
 */
export const STAGING_ROOT_NAME = '.transform-staging';

/**
 * Get the staging root directory path
 */
export function getStagingRootPath(projectRoot: string): string {
  return join(projectRoot, '.speck', STAGING_ROOT_NAME);
}

/**
 * Get the path for a specific version's staging directory
 */
export function getStagingVersionPath(projectRoot: string, version: string): string {
  return join(getStagingRootPath(projectRoot), version);
}

// ============================================================================
// Core Staging Functions
// ============================================================================

/**
 * Create a new staging directory for a transformation
 *
 * Creates the directory structure:
 * .speck/.transform-staging/<version>/
 * ├── staging.json    (metadata)
 * ├── scripts/
 * ├── commands/
 * ├── agents/
 * └── skills/
 *
 * @param projectRoot - Root directory of the project
 * @param version - Upstream version being transformed
 * @param previousVersion - Previous transformed version (optional)
 * @returns Staging context with paths and initial metadata
 */
export async function createStagingDirectory(
  projectRoot: string,
  version: string,
  previousVersion?: string
): Promise<StagingContext> {
  const rootDir = getStagingVersionPath(projectRoot, version);

  // Create directory structure
  const scriptsDir = join(rootDir, 'scripts');
  const commandsDir = join(rootDir, 'commands');
  const agentsDir = join(rootDir, 'agents');
  const skillsDir = join(rootDir, 'skills');

  try {
    await mkdir(scriptsDir, { recursive: true });
    await mkdir(commandsDir, { recursive: true });
    await mkdir(agentsDir, { recursive: true });
    await mkdir(skillsDir, { recursive: true });

    // Create initial metadata
    const metadata: StagingMetadata = {
      status: 'staging',
      startTime: new Date().toISOString(),
      targetVersion: version,
      previousVersion: previousVersion ?? null,
      agentResults: {
        agent1: null,
        agent2: null,
      },
      productionBaseline: {
        files: {},
        capturedAt: new Date().toISOString(),
      },
    };

    // Write metadata file
    await Bun.write(join(rootDir, 'staging.json'), JSON.stringify(metadata, null, 2));

    return {
      rootDir,
      scriptsDir,
      commandsDir,
      agentsDir,
      skillsDir,
      targetVersion: version,
      metadata,
    };
  } catch (error) {
    // Cleanup on error
    if (existsSync(rootDir)) {
      await rm(rootDir, { recursive: true, force: true });
    }
    throw new StagingError(
      `Failed to create staging directory for ${version}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * List all staged files in a staging context
 *
 * @param context - Staging context
 * @returns Array of staged files with paths and categories
 */
export async function listStagedFiles(context: StagingContext): Promise<StagedFile[]> {
  const files: StagedFile[] = [];

  const categories: Array<{ name: FileCategory; dir: string; prodDir: string }> = [
    { name: 'scripts', dir: context.scriptsDir, prodDir: PRODUCTION_DIRS.scripts },
    { name: 'commands', dir: context.commandsDir, prodDir: PRODUCTION_DIRS.commands },
    { name: 'agents', dir: context.agentsDir, prodDir: PRODUCTION_DIRS.agents },
    { name: 'skills', dir: context.skillsDir, prodDir: PRODUCTION_DIRS.skills },
  ];

  // Get project root from staging path
  const projectRoot = context.rootDir.split('.speck')[0]!;

  for (const category of categories) {
    if (!existsSync(category.dir)) continue;

    const categoryFiles = await listFilesRecursive(category.dir);

    for (const filePath of categoryFiles) {
      const relativePath = relative(category.dir, filePath);
      files.push({
        stagingPath: filePath,
        productionPath: join(projectRoot, category.prodDir, relativePath),
        category: category.name,
        relativePath,
      });
    }
  }

  return files;
}

/**
 * Recursively list all files in a directory
 */
async function listFilesRecursive(dir: string): Promise<string[]> {
  const files: string[] = [];

  if (!existsSync(dir)) return files;

  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Update staging status and persist to staging.json
 *
 * @param context - Current staging context
 * @param newStatus - New status to set
 * @returns Updated staging context
 * @throws StagingError if transition is invalid
 */
export async function updateStagingStatus(context: StagingContext, newStatus: StagingStatus): Promise<StagingContext> {
  const currentStatus = context.metadata.status;

  // Check if current status is terminal
  if (isTerminalStatus(currentStatus)) {
    throw new StagingError(`Cannot transition from terminal status '${currentStatus}'`);
  }

  // Check if transition is valid (failed is always allowed from non-terminal)
  if (newStatus !== 'failed' && !isValidTransition(currentStatus, newStatus)) {
    throw new StagingError(`Invalid status transition: '${currentStatus}' → '${newStatus}'`);
  }

  // Update metadata
  const updatedMetadata: StagingMetadata = {
    ...context.metadata,
    status: newStatus,
  };

  // Persist to file
  await Bun.write(join(context.rootDir, 'staging.json'), JSON.stringify(updatedMetadata, null, 2));

  return {
    ...context,
    metadata: updatedMetadata,
  };
}

/**
 * Capture production baseline for conflict detection
 *
 * Records mtime and size of all production files that might be overwritten.
 *
 * @param context - Staging context
 * @returns Updated context with production baseline
 */
export async function captureProductionBaseline(context: StagingContext): Promise<StagingContext> {
  // Get project root from staging path
  const projectRoot = context.rootDir.split('.speck')[0]!;

  const files: Record<string, FileBaseline> = {};

  const productionDirs: Array<{ category: FileCategory; dir: string }> = [
    { category: 'scripts', dir: join(projectRoot, PRODUCTION_DIRS.scripts) },
    { category: 'commands', dir: join(projectRoot, PRODUCTION_DIRS.commands) },
    { category: 'agents', dir: join(projectRoot, PRODUCTION_DIRS.agents) },
    { category: 'skills', dir: join(projectRoot, PRODUCTION_DIRS.skills) },
  ];

  for (const { dir } of productionDirs) {
    if (!existsSync(dir)) continue;

    const productionFiles = await listFilesRecursive(dir);

    for (const filePath of productionFiles) {
      const relativePath = relative(projectRoot, filePath);
      try {
        const stats = await stat(filePath);
        files[relativePath] = {
          exists: true,
          mtime: stats.mtimeMs,
          size: stats.size,
        };
      } catch {
        files[relativePath] = {
          exists: false,
          mtime: null,
          size: null,
        };
      }
    }
  }

  const baseline: ProductionBaseline = {
    files,
    capturedAt: new Date().toISOString(),
  };

  const updatedMetadata: StagingMetadata = {
    ...context.metadata,
    productionBaseline: baseline,
  };

  // Persist to file
  await Bun.write(join(context.rootDir, 'staging.json'), JSON.stringify(updatedMetadata, null, 2));

  return {
    ...context,
    metadata: updatedMetadata,
  };
}

// ============================================================================
// Commit and Rollback Functions (Phase 3+)
// ============================================================================

/**
 * Commit staged files to production atomically
 *
 * Moves all files from staging directories to their production locations.
 * Uses atomic rename operations for each file.
 *
 * @param context - Staging context with files to commit
 * @returns Updated context with 'committed' status
 * @throws StagingError if commit fails
 */
export async function commitStaging(context: StagingContext): Promise<StagingContext> {
  // Verify context is in ready state
  if (context.metadata.status !== 'ready') {
    throw new StagingError(`Cannot commit: staging status is '${context.metadata.status}', expected 'ready'`);
  }

  // Update status to committing
  let updatedContext = await updateStagingStatus(context, 'committing');

  try {
    // Get project root from staging path
    const projectRoot = context.rootDir.split('.speck')[0]!;

    // List all staged files
    const stagedFiles = await listStagedFiles(context);

    // Move each file atomically
    for (const file of stagedFiles) {
      // Ensure production directory exists
      const prodDir = join(projectRoot, PRODUCTION_DIRS[file.category]);
      const targetDir = join(prodDir, file.relativePath.split('/').slice(0, -1).join('/'));
      if (targetDir && targetDir !== prodDir) {
        await mkdir(targetDir, { recursive: true });
      } else {
        await mkdir(prodDir, { recursive: true });
      }

      // Atomic move
      renameSync(file.stagingPath, file.productionPath);
    }

    // Update status to committed
    updatedContext = await updateStagingStatus(updatedContext, 'committed');

    // Cleanup staging directory
    await rm(context.rootDir, { recursive: true, force: true });

    return updatedContext;
  } catch (error) {
    // Mark as failed on error
    updatedContext = await updateStagingStatus(updatedContext, 'failed');
    throw new StagingError(
      `Commit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Rollback staging by removing the staging directory
 *
 * @param context - Staging context to rollback
 * @returns Updated context with 'rolled-back' status
 */
export async function rollbackStaging(context: StagingContext): Promise<StagingContext> {
  // Check if already terminal
  if (isTerminalStatus(context.metadata.status)) {
    throw new StagingError(`Cannot rollback: already in terminal status '${context.metadata.status}'`);
  }

  try {
    // Update status first (before deletion for recovery)
    const updatedContext = await updateStagingStatus(context, 'rolled-back');

    // Remove staging directory
    await rm(context.rootDir, { recursive: true, force: true });

    return updatedContext;
  } catch (error) {
    throw new StagingError(
      `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error : undefined
    );
  }
}

// ============================================================================
// Orphan Detection and Recovery (Phase 6)
// ============================================================================

/**
 * Detect orphaned staging directories
 *
 * @param projectRoot - Root directory of the project
 * @returns Array of orphaned staging directory paths
 */
export async function detectOrphanedStaging(projectRoot: string): Promise<string[]> {
  const stagingRoot = getStagingRootPath(projectRoot);

  if (!existsSync(stagingRoot)) {
    return [];
  }

  const orphans: string[] = [];
  const entries = readdirSync(stagingRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const versionDir = join(stagingRoot, entry.name);
      const metadataPath = join(versionDir, 'staging.json');

      if (existsSync(metadataPath)) {
        try {
          const metadata: unknown = await Bun.file(metadataPath).json();
          const parsed = StagingMetadataSchema.safeParse(metadata);

          if (parsed.success && !isTerminalStatus(parsed.data.status)) {
            // Non-terminal status means orphaned (interrupted)
            orphans.push(versionDir);
          }
        } catch {
          // Invalid metadata - treat as orphaned
          orphans.push(versionDir);
        }
      }
    }
  }

  return orphans;
}

/**
 * Get staging status from a staging directory
 *
 * @param stagingDir - Path to staging version directory
 * @returns Staging metadata or null if invalid
 */
export async function getStagingStatus(stagingDir: string): Promise<StagingMetadata | null> {
  const metadataPath = join(stagingDir, 'staging.json');

  if (!existsSync(metadataPath)) {
    return null;
  }

  try {
    const data: unknown = await Bun.file(metadataPath).json();
    const parsed = StagingMetadataSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Inspect staging directory contents
 *
 * @param context - Staging context to inspect
 * @returns Inspection results with file counts and status
 */
export async function inspectStaging(context: StagingContext): Promise<{
  status: StagingStatus;
  targetVersion: string;
  startTime: string;
  files: {
    scripts: number;
    commands: number;
    agents: number;
    skills: number;
    total: number;
  };
  agentResults: StagingContext['metadata']['agentResults'];
}> {
  const stagedFiles = await listStagedFiles(context);

  const fileCounts = {
    scripts: stagedFiles.filter((f) => f.category === 'scripts').length,
    commands: stagedFiles.filter((f) => f.category === 'commands').length,
    agents: stagedFiles.filter((f) => f.category === 'agents').length,
    skills: stagedFiles.filter((f) => f.category === 'skills').length,
    total: stagedFiles.length,
  };

  return {
    status: context.metadata.status,
    targetVersion: context.metadata.targetVersion,
    startTime: context.metadata.startTime,
    files: fileCounts,
    agentResults: context.metadata.agentResults,
  };
}

// ============================================================================
// Conflict Detection (Phase 7)
// ============================================================================

/**
 * File conflict information
 */
export interface FileConflict {
  path: string;
  baselineMtime: number | null;
  currentMtime: number;
  isNew: boolean;
}

/**
 * Detect file conflicts before commit
 *
 * Compares current production file mtimes with baseline captured at staging start.
 *
 * @param context - Staging context with baseline
 * @returns Array of conflicting files
 */
export async function detectFileConflicts(context: StagingContext): Promise<FileConflict[]> {
  const conflicts: FileConflict[] = [];
  const baseline = context.metadata.productionBaseline;
  const projectRoot = context.rootDir.split('.speck')[0]!;

  for (const [relativePath, baselineInfo] of Object.entries(baseline.files)) {
    const fullPath = join(projectRoot, relativePath);

    if (existsSync(fullPath)) {
      try {
        const stats = await stat(fullPath);

        // Check if file was modified after baseline
        if (baselineInfo.mtime !== null && stats.mtimeMs > baselineInfo.mtime) {
          conflicts.push({
            path: relativePath,
            baselineMtime: baselineInfo.mtime,
            currentMtime: stats.mtimeMs,
            isNew: false,
          });
        }
      } catch {
        // File access error - skip
      }
    } else if (baselineInfo.exists) {
      // File was deleted since baseline - this is also a conflict
      conflicts.push({
        path: relativePath,
        baselineMtime: baselineInfo.mtime,
        currentMtime: 0, // File no longer exists
        isNew: false,
      });
    }
  }

  return conflicts;
}

// ============================================================================
// Manifest and Reporting (Phase 8)
// ============================================================================

/**
 * File manifest entry
 */
export interface ManifestEntry {
  stagingPath: string;
  productionPath: string;
  category: FileCategory;
  action: 'create' | 'update';
}

/**
 * Generate file manifest for staged files
 *
 * @param context - Staging context
 * @returns Manifest of files to be committed
 */
export async function generateFileManifest(context: StagingContext): Promise<ManifestEntry[]> {
  const stagedFiles = await listStagedFiles(context);
  const manifest: ManifestEntry[] = [];

  for (const file of stagedFiles) {
    const action = existsSync(file.productionPath) ? 'update' : 'create';
    manifest.push({
      stagingPath: file.stagingPath,
      productionPath: file.productionPath,
      category: file.category,
      action,
    });
  }

  return manifest;
}

/**
 * Load existing staging context from directory
 *
 * @param stagingDir - Path to staging version directory
 * @returns Staging context or null if invalid
 */
export async function loadStagingContext(stagingDir: string): Promise<StagingContext | null> {
  const metadata = await getStagingStatus(stagingDir);
  if (!metadata) return null;

  return {
    rootDir: stagingDir,
    scriptsDir: join(stagingDir, 'scripts'),
    commandsDir: join(stagingDir, 'commands'),
    agentsDir: join(stagingDir, 'agents'),
    skillsDir: join(stagingDir, 'skills'),
    targetVersion: metadata.targetVersion,
    metadata,
  };
}
