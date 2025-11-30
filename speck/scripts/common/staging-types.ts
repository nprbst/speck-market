/**
 * Staging Types for Atomic Transform Rollback
 *
 * Provides Zod schemas and TypeScript types for staging operations:
 * - StagingContext: Active staging session
 * - StagingMetadata: Persisted staging state (staging.json)
 * - StagedFile: Individual file in staging
 * - AgentResults: Results from transformation agents
 * - ProductionBaseline: Snapshot of production files for conflict detection
 */

import { z } from 'zod';

// ============================================================================
// Enums and Constants
// ============================================================================

/**
 * Valid staging status values
 *
 * State machine:
 * staging → agent1-complete → agent2-complete → ready → committing → committed
 *                                                    ↘ rolled-back
 * Any state can transition to → failed
 */
export const StagingStatusSchema = z.enum([
  'staging', // Initial state, staging directory created
  'agent1-complete', // Agent 1 finished writing to staging
  'agent2-complete', // Agent 2 finished writing to staging
  'ready', // All agents complete, ready to commit
  'committing', // Files being moved to production
  'committed', // Successfully committed (terminal)
  'failed', // Transformation failed (terminal)
  'rolled-back', // Manually or automatically rolled back (terminal)
]);

export type StagingStatus = z.infer<typeof StagingStatusSchema>;

/**
 * File categories for staging
 */
export const FileCategorySchema = z.enum(['scripts', 'commands', 'agents', 'skills']);

export type FileCategory = z.infer<typeof FileCategorySchema>;

// ============================================================================
// File Baseline Types
// ============================================================================

/**
 * Baseline state of a single production file
 */
export const FileBaselineSchema = z.object({
  /** Whether file existed at baseline */
  exists: z.boolean(),
  /** Modification time (ms since epoch), null if didn't exist */
  mtime: z.number().nullable(),
  /** File size in bytes, null if didn't exist */
  size: z.number().nullable(),
});

export type FileBaseline = z.infer<typeof FileBaselineSchema>;

/**
 * Snapshot of production file state at staging start
 * Used for conflict detection before commit
 */
export const ProductionBaselineSchema = z.object({
  /** Map of production file paths to their baseline state */
  files: z.record(z.string(), FileBaselineSchema),
  /** ISO 8601 timestamp when baseline was captured */
  capturedAt: z.string(),
});

export type ProductionBaseline = z.infer<typeof ProductionBaselineSchema>;

// ============================================================================
// Agent Result Types
// ============================================================================

/**
 * Result from a single agent execution
 */
export const AgentResultSchema = z.object({
  /** Whether agent completed successfully */
  success: z.boolean(),
  /** List of files written to staging */
  filesWritten: z.array(z.string()),
  /** Error message if failed */
  error: z.string().nullable(),
  /** Execution time in milliseconds */
  duration: z.number(),
});

export type AgentResult = z.infer<typeof AgentResultSchema>;

/**
 * Results from both transformation agents
 */
export const AgentResultsSchema = z.object({
  /** Agent 1 (bash-to-bun) results */
  agent1: AgentResultSchema.nullable(),
  /** Agent 2 (commands) results */
  agent2: AgentResultSchema.nullable(),
});

export type AgentResults = z.infer<typeof AgentResultsSchema>;

// ============================================================================
// Staging Metadata
// ============================================================================

/**
 * Persisted metadata for staging directory state
 * Stored in staging.json inside the staging version directory
 */
export const StagingMetadataSchema = z.object({
  /** Current staging phase */
  status: StagingStatusSchema,
  /** ISO 8601 timestamp of staging start */
  startTime: z.string(),
  /** Upstream version being transformed */
  targetVersion: z.string(),
  /** Previous successful transformation version (null for first transformation) */
  previousVersion: z.string().nullable(),
  /** Results from agent executions */
  agentResults: AgentResultsSchema,
  /** File state snapshot at staging start */
  productionBaseline: ProductionBaselineSchema,
});

export type StagingMetadata = z.infer<typeof StagingMetadataSchema>;

// ============================================================================
// Staged File
// ============================================================================

/**
 * Represents a file in staging with its source and destination paths
 */
export const StagedFileSchema = z.object({
  /** Absolute path in staging directory */
  stagingPath: z.string(),
  /** Target path in production directory */
  productionPath: z.string(),
  /** Type of file (scripts, commands, agents, skills) */
  category: FileCategorySchema,
  /** Path relative to category directory (e.g., "check-prerequisites.ts") */
  relativePath: z.string(),
});

export type StagedFile = z.infer<typeof StagedFileSchema>;

// ============================================================================
// Staging Context
// ============================================================================

/**
 * Active staging session for a transformation operation
 */
export const StagingContextSchema = z.object({
  /** Absolute path to staging directory (.speck/.transform-staging/<version>/) */
  rootDir: z.string(),
  /** Path to scripts subdirectory */
  scriptsDir: z.string(),
  /** Path to commands subdirectory */
  commandsDir: z.string(),
  /** Path to agents subdirectory */
  agentsDir: z.string(),
  /** Path to skills subdirectory */
  skillsDir: z.string(),
  /** Upstream version being transformed */
  targetVersion: z.string(),
  /** Persisted staging state */
  metadata: StagingMetadataSchema,
});

export type StagingContext = z.infer<typeof StagingContextSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Terminal status values that cannot transition
 */
export const TERMINAL_STATUSES: readonly StagingStatus[] = ['committed', 'failed', 'rolled-back'];

/**
 * Check if a status is terminal (no further transitions allowed)
 */
export function isTerminalStatus(status: StagingStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Valid status transitions
 *
 * Note: 'failed' and 'rolled-back' can be reached from any non-terminal state
 * (handled specially in updateStagingStatus)
 */
export const STATUS_TRANSITIONS: Record<StagingStatus, readonly StagingStatus[]> = {
  staging: ['agent1-complete', 'failed', 'rolled-back'],
  'agent1-complete': ['agent2-complete', 'failed', 'rolled-back'],
  'agent2-complete': ['ready', 'failed', 'rolled-back'],
  ready: ['committing', 'failed', 'rolled-back'],
  committing: ['committed', 'failed', 'rolled-back'],
  committed: [], // Terminal
  failed: [], // Terminal
  'rolled-back': [], // Terminal
};

/**
 * Check if a status transition is valid
 */
export function isValidTransition(from: StagingStatus, to: StagingStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

/**
 * Production directory mappings for each category
 */
export const PRODUCTION_DIRS: Record<FileCategory, string> = {
  scripts: '.speck/scripts',
  commands: '.claude/commands',
  agents: '.claude/agents',
  skills: '.claude/skills',
};

/**
 * Get production path for a staged file
 */
export function getProductionPath(rootDir: string, category: FileCategory, relativePath: string): string {
  return `${rootDir}/${PRODUCTION_DIRS[category]}/${relativePath}`;
}

/**
 * Get staging subdirectory path for a category
 */
export function getStagingCategoryPath(stagingRootDir: string, category: FileCategory): string {
  return `${stagingRootDir}/${category}`;
}
