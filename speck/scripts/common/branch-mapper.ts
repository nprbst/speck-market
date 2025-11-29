/**
 * Simplified Branch Mapping Management
 *
 * Centralized management for branch-to-spec mappings.
 * Storage: .speck/branches.json at repository root
 *
 * Feature: 015-scope-simplification (refactored from 008-stacked-pr-support)
 * Schema Version: 2.0.0 (removed stacked PR fields)
 * Created: 2025-11-18
 * Updated: 2025-11-29
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

// ===========================
// Constants
// ===========================

/** Current schema version */
export const SCHEMA_VERSION = "2.0.0";

/** Legacy schema version prefix (for migration detection) */
export const LEGACY_SCHEMA_VERSION_PREFIX = "1.";

/** Pattern for valid spec IDs (NNN-short-name) */
export const SPEC_ID_PATTERN = /^\d{3}-[a-z0-9-]+$/;

/** Location of branches.json within repository */
export const BRANCHES_FILE_PATH = ".speck/branches.json";

// ===========================
// Type Definitions
// ===========================

/**
 * Single branch entry in the mapping (simplified - no stacked PR fields)
 *
 * Removed fields from v1.x:
 * - baseBranch: Parent branch in dependency chain
 * - status: Branch lifecycle state
 * - pr: Pull request number
 */
export interface BranchEntry {
  /** Non-standard Git branch name */
  name: string;

  /** Associated feature spec ID (NNN-short-name format) */
  specId: string;

  /** ISO timestamp of when mapping was created */
  createdAt: string;

  /** ISO timestamp of last update */
  updatedAt: string;

  /** Parent spec ID for multi-repo child specs (optional) */
  parentSpecId?: string;
}

/**
 * Root container for all branch mappings
 */
export interface BranchMapping {
  /** Schema version for migrations */
  version: string;

  /** All tracked branches */
  branches: BranchEntry[];

  /** Denormalized lookup: specId -> branch names */
  specIndex: Record<string, string[]>;
}

// ===========================
// Legacy Types (for migration)
// ===========================

/** Legacy branch status from v1.x */
export type LegacyBranchStatus = "active" | "submitted" | "merged" | "abandoned";

/** Legacy branch entry from v1.x (with stacked PR fields) */
export interface LegacyBranchEntry {
  name: string;
  specId: string;
  baseBranch?: string;
  status?: LegacyBranchStatus;
  pr?: number | null;
  createdAt: string;
  updatedAt: string;
  parentSpecId?: string;
}

// ===========================
// Zod Schemas
// ===========================

/**
 * Zod schema for BranchEntry validation (simplified)
 */
export const BranchEntrySchema = z.object({
  name: z
    .string()
    .min(1, "Branch name is required")
    .regex(
      /^[a-zA-Z0-9._/-]+$/,
      "Branch name contains invalid characters"
    ),
  specId: z
    .string()
    .regex(SPEC_ID_PATTERN, "Spec ID must match NNN-short-name format"),
  createdAt: z.string().datetime("Invalid ISO timestamp for createdAt"),
  updatedAt: z.string().datetime("Invalid ISO timestamp for updatedAt"),
  parentSpecId: z
    .string()
    .regex(SPEC_ID_PATTERN, "Parent spec ID must match NNN-short-name format")
    .optional(),
});

/**
 * Zod schema for BranchMapping validation
 */
export const BranchMappingSchema = z.object({
  version: z.string().min(1, "Version is required"),
  branches: z.array(BranchEntrySchema),
  specIndex: z.record(z.string(), z.array(z.string())),
});

/**
 * Zod schema for legacy branch entry (for migration)
 */
export const LegacyBranchEntrySchema = z.object({
  name: z.string(),
  specId: z.string(),
  baseBranch: z.string().optional(),
  status: z.enum(["active", "submitted", "merged", "abandoned"]).optional(),
  pr: z.number().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  parentSpecId: z.string().optional(),
});

// ===========================
// Factory Functions
// ===========================

/**
 * Create an empty branch mapping
 */
export function createEmptyBranchMapping(): BranchMapping {
  return {
    version: SCHEMA_VERSION,
    branches: [],
    specIndex: {},
  };
}

/**
 * Create a new branch entry
 *
 * @param name - Non-standard branch name
 * @param specId - Associated spec ID (NNN-short-name)
 * @param parentSpecId - Parent spec for multi-repo (optional)
 */
export function createBranchEntry(
  name: string,
  specId: string,
  parentSpecId?: string
): BranchEntry {
  const now = new Date().toISOString();
  return BranchEntrySchema.parse({
    name,
    specId,
    createdAt: now,
    updatedAt: now,
    parentSpecId,
  });
}

// ===========================
// Operations
// ===========================

/**
 * Rebuild the spec index from branches array
 */
function rebuildSpecIndex(branches: BranchEntry[]): Record<string, string[]> {
  const index: Record<string, string[]> = {};

  for (const branch of branches) {
    if (!index[branch.specId]) {
      index[branch.specId] = [];
    }
    index[branch.specId]!.push(branch.name);
  }

  return index;
}

/**
 * Add a branch entry to the mapping
 * Updates specIndex automatically
 */
export function addBranchEntry(
  mapping: BranchMapping,
  entry: BranchEntry
): BranchMapping {
  // Check for duplicate
  if (mapping.branches.some((b) => b.name === entry.name)) {
    throw new Error(`Branch "${entry.name}" already exists in mapping`);
  }

  const branches = [...mapping.branches, entry];
  const specIndex = rebuildSpecIndex(branches);

  return {
    ...mapping,
    branches,
    specIndex,
  };
}

/**
 * Remove a branch entry from the mapping
 */
export function removeBranchEntry(
  mapping: BranchMapping,
  branchName: string
): BranchMapping {
  const branches = mapping.branches.filter((b) => b.name !== branchName);
  const specIndex = rebuildSpecIndex(branches);

  return {
    ...mapping,
    branches,
    specIndex,
  };
}

/**
 * Get the spec ID for a branch name
 */
export function getSpecForBranch(
  mapping: BranchMapping,
  branchName: string
): string | undefined {
  const entry = mapping.branches.find((b) => b.name === branchName);
  return entry?.specId;
}

/**
 * Get all branch names for a spec ID
 */
export function getBranchesForSpec(
  mapping: BranchMapping,
  specId: string
): string[] {
  return mapping.specIndex[specId] || [];
}

/**
 * Find branch entry by name
 */
export function findBranchEntry(
  mapping: BranchMapping,
  branchName: string
): BranchEntry | null {
  return mapping.branches.find((b) => b.name === branchName) || null;
}

// ===========================
// Migration
// ===========================

/**
 * Check if a mapping needs migration (v1.x → v2.0.0)
 */
export function needsMigration(mapping: { version: string }): boolean {
  return mapping.version.startsWith(LEGACY_SCHEMA_VERSION_PREFIX);
}

/**
 * Migrate a legacy branch mapping to the simplified schema
 *
 * Removes: baseBranch, status, pr fields
 * Keeps: name, specId, createdAt, updatedAt, parentSpecId
 */
export function migrateBranchMapping(
  legacy: { version: string; branches: LegacyBranchEntry[] }
): BranchMapping {
  const branches: BranchEntry[] = legacy.branches.map((entry) => ({
    name: entry.name,
    specId: entry.specId,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    parentSpecId: entry.parentSpecId,
  }));

  const specIndex = rebuildSpecIndex(branches);

  return {
    version: SCHEMA_VERSION,
    branches,
    specIndex,
  };
}

// ===========================
// Validation
// ===========================

/**
 * Validate a branch mapping
 *
 * @param data - Unknown data to validate
 * @returns Validated BranchMapping
 * @throws Zod validation error if invalid
 */
export function validateBranchMapping(data: unknown): BranchMapping {
  return BranchMappingSchema.parse(data);
}

/**
 * Safe validation that returns result object
 */
export function safeParseBranchMapping(
  data: unknown
): z.SafeParseReturnType<unknown, BranchMapping> {
  return BranchMappingSchema.safeParse(data);
}

// ===========================
// File I/O
// ===========================

/**
 * Read branches.json file with validation and auto-migration
 *
 * @param repoRoot - Repository root directory
 * @returns Validated BranchMapping or empty state if file doesn't exist
 */
export async function readBranches(repoRoot: string): Promise<BranchMapping> {
  const filePath = path.join(repoRoot, BRANCHES_FILE_PATH);

  if (!existsSync(filePath)) {
    return createEmptyBranchMapping();
  }

  try {
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content) as unknown;

    // Check if migration is needed
    if (
      typeof data === "object" &&
      data !== null &&
      "version" in data &&
      typeof (data as { version: unknown }).version === "string"
    ) {
      const versionedData = data as { version: string; branches?: unknown[] };

      if (needsMigration(versionedData)) {
        console.log(
          `[INFO] Migrating branches.json from v${versionedData.version} to v${SCHEMA_VERSION}`
        );

        // Parse legacy format
        const legacyBranches = (versionedData.branches || []).map((b) =>
          LegacyBranchEntrySchema.parse(b)
        );

        const migrated = migrateBranchMapping({
          version: versionedData.version,
          branches: legacyBranches,
        });

        // Write migrated data
        await writeBranches(repoRoot, migrated);

        return migrated;
      }
    }

    // Validate with Zod
    const result = BranchMappingSchema.safeParse(data);

    if (!result.success) {
      throw new Error(
        `Corrupted branches.json - restore from git history:\n` +
          `  git show HEAD:.speck/branches.json > .speck/branches.json\n\n` +
          `Validation errors:\n${result.error.message}`
      );
    }

    return result.data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Corrupted branches.json (invalid JSON) - restore from git history:\n` +
          `  git show HEAD:.speck/branches.json > .speck/branches.json`
      );
    }
    throw error;
  }
}

/**
 * Write branches.json with atomic update
 *
 * Uses temp file + rename for atomic write to prevent corruption
 *
 * @param repoRoot - Repository root directory
 * @param mapping - BranchMapping to write
 */
export async function writeBranches(
  repoRoot: string,
  mapping: BranchMapping
): Promise<void> {
  const filePath = path.join(repoRoot, BRANCHES_FILE_PATH);
  const tempPath = `${filePath}.tmp`;

  // Validate before writing
  const result = BranchMappingSchema.safeParse(mapping);
  if (!result.success) {
    throw new Error(`Invalid branch mapping: ${result.error.message}`);
  }

  // Ensure .speck directory exists
  const speckDir = path.join(repoRoot, ".speck");
  if (!existsSync(speckDir)) {
    await fs.mkdir(speckDir, { recursive: true });
  }

  // Write to temp file
  const content = JSON.stringify(mapping, null, 2);
  await fs.writeFile(tempPath, content, "utf-8");

  // Atomic rename
  await fs.rename(tempPath, filePath);
}

// ===========================
// Multi-Repo Aggregation (retained from Feature 009)
// ===========================

/**
 * Repository branch summary for aggregate views
 */
export interface RepoBranchSummary {
  repoPath: string;
  repoName: string;
  specId: string | null;
  branchCount: number;
  branches: BranchEntry[];
}

/**
 * Aggregated branch status across all repositories
 */
export interface AggregatedBranchStatus {
  rootRepo: RepoBranchSummary | null;
  childRepos: Map<string, RepoBranchSummary>;
}

/**
 * Collect branches across all repos (root + children)
 *
 * @param speckRoot - Speck root directory
 * @param _repoRoot - Current repository root
 * @returns Aggregated branch status with root and child summaries
 */
export async function getAggregatedBranchStatus(
  speckRoot: string,
  _repoRoot: string
): Promise<AggregatedBranchStatus> {
  const { findChildReposWithNames } = await import("./paths");

  let rootRepo: RepoBranchSummary | null = null;
  try {
    const rootMapping = await readBranches(speckRoot);
    if (rootMapping.branches.length > 0) {
      rootRepo = buildRepoBranchSummary(speckRoot, "root", rootMapping);
    }
  } catch {
    // Root may not have branches.json - not an error
  }

  const childRepos = new Map<string, RepoBranchSummary>();
  const childRepoMap = await findChildReposWithNames(speckRoot);

  const childRepoPromises = Array.from(childRepoMap.entries()).map(
    async ([childName, childPath]) => {
      try {
        const childMapping = await readBranches(childPath);
        if (childMapping.branches.length > 0) {
          const summary = buildRepoBranchSummary(childPath, childName, childMapping);
          return { childName, summary };
        }
      } catch {
        // Child may not have branches.json - skip
      }
      return null;
    }
  );

  const childResults = await Promise.all(childRepoPromises);
  for (const result of childResults) {
    if (result) {
      childRepos.set(result.childName, result.summary);
    }
  }

  return {
    rootRepo,
    childRepos,
  };
}

/**
 * Build repository branch summary from branch mapping
 */
function buildRepoBranchSummary(
  repoPath: string,
  repoName: string,
  mapping: BranchMapping
): RepoBranchSummary {
  const specIds = [...new Set(mapping.branches.map((b) => b.specId))];
  const specId = specIds.length === 1 ? (specIds[0] ?? null) : null;

  return {
    repoPath,
    repoName,
    specId,
    branchCount: mapping.branches.length,
    branches: mapping.branches,
  };
}
