/**
 * Branch Stack Metadata Management
 *
 * Centralized management for stacked PR branches with dependency tracking.
 * Storage: .speck/branches.json at repository root
 *
 * Feature: 008-stacked-pr-support
 * Created: 2025-11-18
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

// ===========================
// Type Definitions (T002)
// ===========================

/**
 * Branch status lifecycle
 */
export type BranchStatus = "active" | "submitted" | "merged" | "abandoned";

/**
 * Single branch entry in the stack
 */
export interface BranchEntry {
  name: string;           // Git branch name (freeform)
  specId: string;         // Spec identifier (NNN-feature-name)
  baseBranch: string;     // Parent branch in dependency chain
  status: BranchStatus;   // Branch lifecycle state
  pr: number | null;      // Pull request number (optional)
  createdAt: string;      // ISO 8601 timestamp
  updatedAt: string;      // ISO 8601 timestamp
  parentSpecId?: string;  // Parent spec ID (multi-repo child contexts only)
}

/**
 * Root container for all branch stack metadata
 */
export interface BranchMapping {
  version: string;                           // Schema version (semver)
  branches: BranchEntry[];                   // All stacked branches
  specIndex: Record<string, string[]>;       // Denormalized lookup: specId -> branch names
}

/**
 * Computed view for visualization (not persisted)
 */
export interface BranchStack {
  specId: string;
  chains: BranchChain[];
}

/**
 * Single dependency chain from root to leaf
 */
export interface BranchChain {
  branches: string[];  // Branch names in dependency order
}

// ===========================
// Zod Schemas (T003)
// ===========================

/**
 * Zod schema for BranchEntry validation
 */
export const BranchEntrySchema = z.object({
  name: z.string().min(1, "Branch name cannot be empty"),
  specId: z.string().regex(/^\d{3}-.+$/, "Spec ID must match pattern NNN-feature-name"),
  baseBranch: z.string().min(1, "Base branch cannot be empty"),
  status: z.enum(["active", "submitted", "merged", "abandoned"]),
  pr: z.number().int().positive().nullable(),
  createdAt: z.string().datetime({ message: "Invalid ISO 8601 timestamp" }),
  updatedAt: z.string().datetime({ message: "Invalid ISO 8601 timestamp" }),
  parentSpecId: z.string().regex(/^\d{3}-.+$/, "Parent spec ID must match pattern NNN-feature-name").optional(),
});

/**
 * Zod schema for BranchMapping validation
 */
export const BranchMappingSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be semver format"),
  branches: z.array(BranchEntrySchema),
  specIndex: z.record(z.string(), z.array(z.string())),
});

// ===========================
// Constants
// ===========================

const CURRENT_VERSION = "1.1.0";  // Updated for multi-repo support (Feature 009)
const BRANCHES_FILE = ".speck/branches.json";

// ===========================
// Core Operations
// ===========================

/**
 * Read branches.json file with validation (T004)
 *
 * @param repoRoot - Repository root directory
 * @returns Validated BranchMapping or empty state if file doesn't exist
 */
export async function readBranches(repoRoot: string): Promise<BranchMapping> {
  const filePath = path.join(repoRoot, BRANCHES_FILE);

  if (!existsSync(filePath)) {
    // Return empty state (file will be created on first write)
    return {
      version: CURRENT_VERSION,
      branches: [],
      specIndex: {},
    };
  }

  try {
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content) as unknown;

    // Validate with Zod
    const result = BranchMappingSchema.safeParse(data);

    if (!result.success) {
      // Attempt auto-repair for common issues
      const repaired = attemptRepair(data, repoRoot);
      if (repaired) {
        console.warn("[WARN] Auto-repaired branches.json - review changes");
        await writeBranches(repoRoot, repaired);
        return repaired;
      }

      // Cannot repair - provide recovery instructions
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
 * Write branches.json with atomic update (T005)
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
  const filePath = path.join(repoRoot, BRANCHES_FILE);
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

/**
 * Rebuild specIndex from branches array (T006)
 *
 * @param mapping - BranchMapping with potentially stale index
 * @returns Updated BranchMapping with rebuilt index
 */
export function rebuildSpecIndex(mapping: BranchMapping): BranchMapping {
  const specIndex: Record<string, string[]> = {};

  for (const branch of mapping.branches) {
    if (!specIndex[branch.specId]) {
      specIndex[branch.specId] = [];
    }
    specIndex[branch.specId]!.push(branch.name);
  }

  return {
    ...mapping,
    specIndex,
  };
}

// ===========================
// Query Functions
// ===========================

/**
 * Get spec ID for a given branch (T007)
 *
 * @param mapping - BranchMapping to query
 * @param branchName - Branch name to lookup
 * @returns Spec ID or null if not found
 */
export function getSpecForBranch(
  mapping: BranchMapping,
  branchName: string
): string | null {
  const branch = mapping.branches.find(b => b.name === branchName);
  return branch ? branch.specId : null;
}

/**
 * Get all branches for a spec (T008)
 *
 * Uses denormalized specIndex for O(1) lookup
 *
 * @param mapping - BranchMapping to query
 * @param specId - Spec ID to lookup
 * @returns Array of branch names (empty if spec not found)
 */
export function getBranchesForSpec(
  mapping: BranchMapping,
  specId: string
): string[] {
  return mapping.specIndex[specId] || [];
}

/**
 * Find branch entry by name (T009)
 *
 * @param mapping - BranchMapping to query
 * @param branchName - Branch name to find
 * @returns BranchEntry or null if not found
 */
export function findBranchEntry(
  mapping: BranchMapping,
  branchName: string
): BranchEntry | null {
  return mapping.branches.find(b => b.name === branchName) || null;
}

// ===========================
// Mutation Functions
// ===========================

/**
 * Add new branch to mapping (T010)
 *
 * @param mapping - BranchMapping to modify
 * @param entry - BranchEntry to add
 * @returns Updated BranchMapping
 */
export function addBranch(
  mapping: BranchMapping,
  entry: BranchEntry
): BranchMapping {
  // Validate entry
  const result = BranchEntrySchema.safeParse(entry);
  if (!result.success) {
    throw new Error(`Invalid branch entry: ${result.error.message}`);
  }

  // Check for duplicates
  if (mapping.branches.some(b => b.name === entry.name)) {
    throw new Error(`Branch '${entry.name}' already exists in mapping`);
  }

  // Add to branches array
  const branches = [...mapping.branches, entry];

  // Rebuild index
  return rebuildSpecIndex({
    ...mapping,
    branches,
  });
}

/**
 * Update branch status (T011)
 *
 * @param mapping - BranchMapping to modify
 * @param branchName - Branch to update
 * @param status - New status
 * @param pr - Optional PR number (required for 'submitted' status)
 * @returns Updated BranchMapping
 */
export function updateBranchStatus(
  mapping: BranchMapping,
  branchName: string,
  status: BranchStatus,
  pr?: number
): BranchMapping {
  const branch = findBranchEntry(mapping, branchName);
  if (!branch) {
    throw new Error(`Branch '${branchName}' not found in mapping`);
  }

  // Validate status transition
  validateStatusTransition(branch.status, status);

  // Validate PR number for submitted status
  if (status === "submitted" && !pr && !branch.pr) {
    throw new Error(`PR number required for 'submitted' status`);
  }

  // Update branch
  const branches = mapping.branches.map(b =>
    b.name === branchName
      ? {
          ...b,
          status,
          pr: pr !== undefined ? pr : b.pr,
          updatedAt: new Date().toISOString(),
        }
      : b
  );

  return {
    ...mapping,
    branches,
  };
}

/**
 * Remove branch from mapping (T012)
 *
 * @param mapping - BranchMapping to modify
 * @param branchName - Branch to remove
 * @returns Updated BranchMapping
 */
export function removeBranch(
  mapping: BranchMapping,
  branchName: string
): BranchMapping {
  const branch = findBranchEntry(mapping, branchName);
  if (!branch) {
    throw new Error(`Branch '${branchName}' not found in mapping`);
  }

  // Remove from branches array
  const branches = mapping.branches.filter(b => b.name !== branchName);

  // Rebuild index
  return rebuildSpecIndex({
    ...mapping,
    branches,
  });
}

// ===========================
// Validation Functions
// ===========================

/**
 * Validate entire branch mapping with cycle detection (T013)
 *
 * @param mapping - BranchMapping to validate
 * @throws Error if validation fails (circular dependency, invalid refs, etc.)
 */
export function validateBranchMapping(
  mapping: BranchMapping,
  _repoRoot: string
): void {
  // Schema validation
  const result = BranchMappingSchema.safeParse(mapping);
  if (!result.success) {
    throw new Error(`Invalid branch mapping schema: ${result.error.message}`);
  }

  // Check for cycles (DFS)
  for (const branch of mapping.branches) {
    const cycle = detectCycle(branch.name, mapping);
    if (cycle) {
      throw new Error(`Circular dependency detected: ${cycle.join(" → ")}`);
    }
  }

  // Verify index consistency
  for (const branch of mapping.branches) {
    const indexBranches = mapping.specIndex[branch.specId] || [];
    if (!indexBranches.includes(branch.name)) {
      throw new Error(
        `Index inconsistency: Branch '${branch.name}' missing from specIndex['${branch.specId}']`
      );
    }
  }

  // Verify no orphaned index entries
  for (const [specId, branchNames] of Object.entries(mapping.specIndex)) {
    for (const branchName of branchNames) {
      if (!mapping.branches.some(b => b.name === branchName)) {
        throw new Error(
          `Orphaned index entry: Branch '${branchName}' in specIndex['${specId}'] but not in branches array`
        );
      }
    }
  }
}

/**
 * Detect circular dependencies using DFS (T017)
 *
 * @param branchName - Starting branch
 * @param mapping - BranchMapping to check
 * @returns Array of branch names forming cycle, or null if no cycle
 */
export function detectCycle(
  branchName: string,
  mapping: BranchMapping
): string[] | null {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(current: string): string[] | null {
    if (recursionStack.has(current)) {
      // Cycle detected - return path from cycle start
      const cycleStart = path.indexOf(current);
      return [...path.slice(cycleStart), current];
    }

    if (visited.has(current)) {
      return null;
    }

    visited.add(current);
    recursionStack.add(current);
    path.push(current);

    const branch = mapping.branches.find(b => b.name === current);
    if (branch && branch.baseBranch) {
      // Only follow if baseBranch is another stacked branch (not main/master)
      const baseIsStacked = mapping.branches.some(b => b.name === branch.baseBranch);
      if (baseIsStacked) {
        const cycle = dfs(branch.baseBranch);
        if (cycle) return cycle;
      }
    }

    path.pop();
    recursionStack.delete(current);
    return null;
  }

  return dfs(branchName);
}

/**
 * Validate status transition (T018)
 *
 * Prevents transitions from terminal states
 *
 * @param currentStatus - Current branch status
 * @param newStatus - Desired status
 * @throws Error if transition is invalid
 */
export function validateStatusTransition(
  currentStatus: BranchStatus,
  _newStatus: BranchStatus
): void {
  // Terminal states: cannot transition
  if (currentStatus === "merged") {
    throw new Error(`Cannot transition from 'merged' (terminal state)`);
  }
  if (currentStatus === "abandoned") {
    throw new Error(`Cannot transition from 'abandoned' (terminal state)`);
  }

  // All other transitions are valid
}

// ===========================
// Auto-Repair Functions
// ===========================

/**
 * Attempt to auto-repair common issues
 *
 * @param data - Parsed JSON data (potentially invalid)
 * @param repoRoot - Repository root directory
 * @returns Repaired BranchMapping or null if cannot repair
 */
interface RepairData {
  version?: string;
  branches?: Array<{
    createdAt?: string | number;
    updatedAt?: string | number;
    [key: string]: unknown;
  }>;
  specIndex?: unknown;
  [key: string]: unknown;
}

function attemptRepair(
  data: unknown,
  _repoRoot: string
): BranchMapping | null {
  try {
    const repairData = data as RepairData;

    // Ensure version exists
    if (!repairData.version) {
      repairData.version = CURRENT_VERSION;
    }

    // Ensure branches array exists
    if (!Array.isArray(repairData.branches)) {
      repairData.branches = [];
    }

    // Repair invalid timestamps
    for (const branch of repairData.branches) {
      if (!branch.createdAt || !isValidISOTimestamp(branch.createdAt as string)) {
        branch.createdAt = new Date().toISOString();
      }
      if (!branch.updatedAt || !isValidISOTimestamp(branch.updatedAt as string)) {
        branch.updatedAt = new Date().toISOString();
      }
    }

    // Rebuild missing or corrupted specIndex
    if (!repairData.specIndex || typeof repairData.specIndex !== "object") {
      repairData.specIndex = {};
    }

    // Rebuild index from branches
    const repaired = rebuildSpecIndex(repairData as unknown as BranchMapping);

    // Validate repaired data
    const result = BranchMappingSchema.safeParse(repaired);
    if (result.success) {
      return result.data;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if string is valid ISO 8601 timestamp
 */
function isValidISOTimestamp(value: string): boolean {
  try {
    const date = new Date(value);
    return date.toISOString() === value;
  } catch {
    return false;
  }
}

// ===========================
// Multi-Repo Aggregation (Feature 009)
// ===========================

/**
 * Repository branch summary for aggregate views
 */
export interface RepoBranchSummary {
  repoPath: string;           // Absolute path to git repository
  repoName: string;           // Directory name (for display)
  specId: string | null;      // Current spec ID or null if no branches
  branchCount: number;        // Total branches
  statusCounts: {             // Count by status
    active: number;
    submitted: number;
    merged: number;
    abandoned: number;
  };
  chains: BranchChain[];      // Dependency chains
  branches: BranchEntry[];    // Full branch details for display (T034 - PR numbers, status)
}

/**
 * Aggregated branch status across all repositories
 */
export interface AggregatedBranchStatus {
  rootRepo: RepoBranchSummary | null;           // Root repository summary
  childRepos: Map<string, RepoBranchSummary>;   // Child repo name → summary
}

/**
 * T031 [P] [US2] - Collect branches across all repos (root + children)
 *
 * Reads .speck/branches.json from root and each child repository,
 * aggregating into a unified view for multi-repo status displays.
 *
 * @param speckRoot - Speck root directory
 * @param repoRoot - Current repository root
 * @returns Aggregated branch status with root and child summaries
 */
export async function getAggregatedBranchStatus(
  speckRoot: string,
  _repoRoot: string
): Promise<AggregatedBranchStatus> {
  // Import paths module (lazily to avoid circular dependency)
  const { findChildReposWithNames } = await import("./paths");

  // Read root repository branches
  let rootRepo: RepoBranchSummary | null = null;
  try {
    const rootMapping = await readBranches(speckRoot);
    if (rootMapping.branches.length > 0) {
      rootRepo = buildRepoBranchSummary(speckRoot, "root", rootMapping);
    }
  } catch (error) {
    // Root may not have branches.json - not an error
  }

  // Find and read child repositories (using logical names from symlinks)
  const childRepos = new Map<string, RepoBranchSummary>();
  const childRepoMap = await findChildReposWithNames(speckRoot);

  // T091 - Parallel repo scanning for performance optimization
  const childRepoPromises = Array.from(childRepoMap.entries()).map(async ([childName, childPath]) => {
    try {
      const childMapping = await readBranches(childPath);
      if (childMapping.branches.length > 0) {
        const summary = buildRepoBranchSummary(childPath, childName, childMapping);
        return { childName, summary };
      }
    } catch (error) {
      // Child may not have branches.json - skip
    }
    return null;
  });

  const childResults = await Promise.all(childRepoPromises);
  for (const result of childResults) {
    if (result) {
      childRepos.set(result.childName, result.summary);
    }
  }

  return {
    rootRepo,
    childRepos
  };
}

/**
 * Build repository branch summary from branch mapping
 *
 * @param repoPath - Repository path
 * @param repoName - Repository display name
 * @param mapping - Branch mapping data
 * @returns Repository branch summary
 */
function buildRepoBranchSummary(
  repoPath: string,
  repoName: string,
  mapping: BranchMapping
): RepoBranchSummary {
  // Count branches by status
  const statusCounts = {
    active: 0,
    submitted: 0,
    merged: 0,
    abandoned: 0
  };

  for (const branch of mapping.branches) {
    statusCounts[branch.status]++;
  }

  // Get unique spec IDs
  const specIds = [...new Set(mapping.branches.map(b => b.specId))];
  const specId = specIds.length === 1 ? (specIds[0] ?? null) : null;

  // Build dependency chains
  const chains = buildDependencyChains(mapping);

  return {
    repoPath,
    repoName,
    specId,
    branchCount: mapping.branches.length,
    statusCounts,
    chains,
    branches: mapping.branches
  };
}

/**
 * Build dependency chains from branch mapping
 *
 * @param mapping - Branch mapping
 * @returns Array of branch chains (root → leaves)
 */
function buildDependencyChains(mapping: BranchMapping): BranchChain[] {
  const chains: BranchChain[] = [];
  const processed = new Set<string>();

  // Find root branches (branches whose baseBranch is not in the mapping)
  const branchNames = new Set(mapping.branches.map(b => b.name));
  const rootBranches = mapping.branches.filter(
    b => !branchNames.has(b.baseBranch)
  );

  // Build chain from each root
  for (const root of rootBranches) {
    if (!processed.has(root.name)) {
      const chain = buildChainFromBranch(root.name, mapping, processed);
      if (chain.length > 0) {
        chains.push({ branches: chain });
      }
    }
  }

  return chains;
}

/**
 * Recursively build dependency chain from a branch
 *
 * @param branchName - Starting branch name
 * @param mapping - Branch mapping
 * @param processed - Set of already processed branches
 * @returns Array of branch names in dependency order
 */
function buildChainFromBranch(
  branchName: string,
  mapping: BranchMapping,
  processed: Set<string>
): string[] {
  processed.add(branchName);

  // Find children (branches that have this branch as baseBranch)
  const children = mapping.branches.filter(b => b.baseBranch === branchName);

  if (children.length === 0) {
    return [branchName];
  }

  // For simplicity, follow first child (stacked chains are typically linear)
  // In case of multiple children, we'd need a more complex visualization
  const firstChild = children[0];
  if (firstChild && !processed.has(firstChild.name)) {
    return [branchName, ...buildChainFromBranch(firstChild.name, mapping, processed)];
  }

  return [branchName];
}
