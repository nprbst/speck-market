/**
 * Transformation History Manager
 *
 * Manages .speck/transformation-history.json file for tracking factoring decisions
 * made during upstream transformations per FR-013.
 *
 * Enables incremental transformations to reference previous factoring decisions
 * and maintain consistency across versions.
 */

import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import { dirname } from "path";
import type {
  TransformationHistory,
  TransformationHistoryEntry,
  FactoringMapping,
  ArtifactType,
} from "../../../specs/001-speck-core-project/contracts/transformation-history";
import {
  createEmptyHistory,
  createHistoryEntry,
  addMapping,
  getEntryByVersion,
  getLatestSuccessfulTransformation,
  validateHistory,
} from "../../../specs/001-speck-core-project/contracts/transformation-history";

/**
 * Custom error for transformation history operations
 */
export class TransformationHistoryError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "TransformationHistoryError";
  }
}

/**
 * Read transformation history from .speck/transformation-history.json
 *
 * @param historyPath - Path to transformation-history.json file
 * @returns Parsed and validated transformation history
 * @throws TransformationHistoryError if file is invalid
 *
 * @example
 * ```typescript
 * const history = await readHistory(".speck/transformation-history.json");
 * console.log(`Latest version: ${history.latestVersion}`);
 * ```
 */
export async function readHistory(
  historyPath: string
): Promise<TransformationHistory> {
  if (!existsSync(historyPath)) {
    // Return empty history if file doesn't exist
    return createEmptyHistory();
  }

  try {
    const file = Bun.file(historyPath);
    const data = await file.json() as unknown;

    if (!validateHistory(data)) {
      throw new TransformationHistoryError(
        `Invalid transformation history structure in ${historyPath}`
      );
    }

    return data;
  } catch (error) {
    if (error instanceof TransformationHistoryError) {
      throw error;
    }
    throw new TransformationHistoryError(
      `Failed to read transformation history from ${historyPath}`,
      error as Error
    );
  }
}

/**
 * Write transformation history to .speck/transformation-history.json atomically
 *
 * Uses temp file + rename strategy for atomic write (prevents partial state).
 *
 * @param historyPath - Path to transformation-history.json file
 * @param history - Transformation history to write
 * @throws TransformationHistoryError if write fails
 *
 * @example
 * ```typescript
 * const history = await readHistory(".speck/transformation-history.json");
 * history.latestVersion = "v1.0.0";
 * await writeHistory(".speck/transformation-history.json", history);
 * ```
 */
export async function writeHistory(
  historyPath: string,
  history: TransformationHistory
): Promise<void> {
  // Validate before writing
  if (!validateHistory(history)) {
    throw new TransformationHistoryError(
      "Cannot write invalid transformation history structure"
    );
  }

  try {
    // Ensure parent directory exists
    const dir = dirname(historyPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    // Atomic write: temp file + rename
    const tempPath = `${historyPath}.tmp`;
    await Bun.write(tempPath, JSON.stringify(history, null, 2));

    // Atomic rename (replaces existing file)
    await Bun.write(historyPath, await Bun.file(tempPath).text());

    // Clean up temp file
    try {
      await Bun.write(tempPath, ""); // Clear content
    } catch {
      // Ignore cleanup errors
    }
  } catch (error) {
    throw new TransformationHistoryError(
      `Failed to write transformation history to ${historyPath}`,
      error as Error
    );
  }
}

/**
 * Add a new transformation entry to the history
 *
 * Updates latestVersion and prepends new entry to entries array (newest first).
 * Automatically writes to disk.
 *
 * @param historyPath - Path to transformation-history.json file
 * @param version - Upstream version (e.g., "v1.0.0")
 * @param commitSha - Git commit SHA of upstream release
 * @param status - Transformation status
 * @param mappings - Array of factoring mappings (optional)
 * @throws TransformationHistoryError if operation fails
 *
 * @example
 * ```typescript
 * await addTransformationEntry(
 *   ".speck/transformation-history.json",
 *   "v1.0.0",
 *   "abc123",
 *   "transformed",
 *   [{ source: ".claude/commands/plan.md", generated: ".claude/commands/speck.plan.md", type: "command" }]
 * );
 * ```
 */
export async function addTransformationEntry(
  historyPath: string,
  version: string,
  commitSha: string,
  status: "transformed" | "failed" | "partial",
  mappings: FactoringMapping[] = []
): Promise<void> {
  const history = await readHistory(historyPath);

  // Create new entry
  const entry = createHistoryEntry(version, commitSha, status, mappings);

  // Update history
  history.latestVersion = version;
  history.entries.unshift(entry); // Prepend (newest first)

  // Write atomically
  await writeHistory(historyPath, history);
}

/**
 * Update an existing transformation entry's status
 *
 * @param historyPath - Path to transformation-history.json file
 * @param version - Version to update
 * @param status - New status
 * @param errorDetails - Optional error details if status is "failed"
 * @throws TransformationHistoryError if version not found or operation fails
 *
 * @example
 * ```typescript
 * await updateTransformationStatus(
 *   ".speck/transformation-history.json",
 *   "v1.0.0",
 *   "failed",
 *   "Agent bash-to-bun failed: unsupported syntax"
 * );
 * ```
 */
export async function updateTransformationStatus(
  historyPath: string,
  version: string,
  status: "transformed" | "failed" | "partial",
  errorDetails?: string
): Promise<void> {
  const history = await readHistory(historyPath);

  const entry = getEntryByVersion(history, version);
  if (!entry) {
    throw new TransformationHistoryError(
      `Version ${version} not found in transformation history`
    );
  }

  entry.status = status;
  if (errorDetails) {
    entry.errorDetails = errorDetails;
  }

  await writeHistory(historyPath, history);
}

/**
 * Add a factoring mapping to an existing transformation entry
 *
 * @param historyPath - Path to transformation-history.json file
 * @param version - Version to update
 * @param mapping - Factoring mapping to add
 * @throws TransformationHistoryError if version not found or operation fails
 *
 * @example
 * ```typescript
 * await addFactoringMapping(
 *   ".speck/transformation-history.json",
 *   "v1.0.0",
 *   {
 *     source: ".claude/commands/plan.md",
 *     generated: ".claude/agents/speck.plan-workflow.md",
 *     type: "agent",
 *     description: "Extracted multi-step planning workflow",
 *     rationale: "Section has >3 steps with branching logic per FR-007 criteria"
 *   }
 * );
 * ```
 */
export async function addFactoringMapping(
  historyPath: string,
  version: string,
  mapping: FactoringMapping
): Promise<void> {
  const history = await readHistory(historyPath);

  const entry = getEntryByVersion(history, version);
  if (!entry) {
    throw new TransformationHistoryError(
      `Version ${version} not found in transformation history`
    );
  }

  addMapping(entry, mapping);

  await writeHistory(historyPath, history);
}

/**
 * Get previous factoring decision for a source file
 *
 * Looks up the most recent transformation where the source file was processed
 * and returns the mapping decision.
 *
 * @param historyPath - Path to transformation-history.json file
 * @param source - Source file path (relative to upstream/<version>/)
 * @returns Previous factoring mapping if found, undefined otherwise
 *
 * @example
 * ```typescript
 * const previousMapping = await getPreviousFactoringDecision(
 *   ".speck/transformation-history.json",
 *   ".claude/commands/plan.md"
 * );
 *
 * if (previousMapping) {
 *   console.log(`Previously factored to: ${previousMapping.generated}`);
 *   console.log(`Rationale: ${previousMapping.rationale}`);
 * }
 * ```
 */
export async function getPreviousFactoringDecision(
  historyPath: string,
  source: string
): Promise<FactoringMapping | undefined> {
  const history = await readHistory(historyPath);

  // Search entries newest-first for matching source
  for (const entry of history.entries) {
    for (const mapping of entry.mappings) {
      if (mapping.source === source) {
        return mapping;
      }
    }
  }

  return undefined;
}

/**
 * Get the latest successful transformation version
 *
 * @param historyPath - Path to transformation-history.json file
 * @returns Version string if found, undefined if no successful transformations
 *
 * @example
 * ```typescript
 * const latestVersion = await getLatestTransformedVersion(".speck/transformation-history.json");
 * console.log(`Latest successfully transformed version: ${latestVersion ?? "none"}`);
 * ```
 */
export async function getLatestTransformedVersion(
  historyPath: string
): Promise<string | undefined> {
  const history = await readHistory(historyPath);
  const latest = getLatestSuccessfulTransformation(history);
  return latest?.version;
}

/**
 * Export utility functions from contract
 */
export {
  createEmptyHistory,
  createHistoryEntry,
  addMapping,
  getEntryByVersion,
  getLatestSuccessfulTransformation,
  validateHistory,
};

/**
 * Export types from contract
 */
export type {
  TransformationHistory,
  TransformationHistoryEntry,
  FactoringMapping,
  ArtifactType,
};
