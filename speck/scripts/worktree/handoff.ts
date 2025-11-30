/**
 * Session Handoff Module
 *
 * Implements session handoff document generation, parsing, and worktree
 * setup for transferring feature context to new Claude Code sessions.
 *
 * @feature 015-scope-simplification
 * @tasks T044, T045, T046, T047, T048a-d, T049, T050, T050a, T051, T051a, T052
 * @see session-handoff-addendum.md
 */

import { z } from "zod";
import { mkdirSync, existsSync, renameSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import path from "node:path";
import { $ } from "bun";

// =============================================================================
// Schema Definition (from contracts/handoff-document.ts)
// =============================================================================

/**
 * Zod schema for handoff document validation
 */
export const HandoffDocumentSchema = z.object({
  /** Feature name from spec.md title */
  featureName: z.string().min(1, "Feature name is required"),

  /** Git branch name */
  branchName: z
    .string()
    .min(1, "Branch name is required")
    .regex(
      /^[a-zA-Z0-9._/-]+$/,
      "Branch name contains invalid characters"
    ),

  /** Relative path from worktree to spec.md */
  specPath: z.string().min(1, "Spec path is required"),

  /** ISO timestamp of handoff creation */
  createdAt: z.string().datetime("Invalid ISO timestamp"),

  /** Brief description of feature purpose */
  context: z.string().min(1, "Context is required"),

  /** Current implementation status (if tasks.md exists) */
  status: z
    .enum(["not-started", "in-progress", "completed"])
    .optional(),

  /** Next suggested action for the developer */
  nextStep: z.string().min(1, "Next step is required"),
});

/**
 * TypeScript type inferred from schema
 */
export type HandoffDocument = z.infer<typeof HandoffDocumentSchema>;

// =============================================================================
// File Locations
// =============================================================================

/**
 * Handoff document location within worktree
 */
export const HANDOFF_FILE_PATH = ".speck/handoff.md";

/**
 * Archived handoff document location
 */
export const HANDOFF_DONE_PATH = ".speck/handoff.done.md";

/**
 * Claude settings file location
 */
export const CLAUDE_SETTINGS_PATH = ".claude/settings.json";

/**
 * Hook script location
 */
export const HOOK_SCRIPT_PATH = ".claude/scripts/handoff.sh";

/**
 * VSCode tasks file location
 */
export const VSCODE_TASKS_PATH = ".vscode/tasks.json";

// =============================================================================
// Template Constants (T052)
// =============================================================================

/**
 * Claude settings.json template
 *
 * NOTE: SessionStart hook disabled to avoid race condition with VSCode task.
 * The VSCode task launches Claude with an initial prompt that reads handoff.md,
 * but the hook would rename the file to .done.md before Claude could read it.
 */
export const CLAUDE_SETTINGS_TEMPLATE = {
  hooks: {},
};

/**
 * VSCode tasks.json template for auto-opening Claude panel
 * Using terminal-based Claude with initial prompt for fully automated handoff
 *
 * NOTE: We use the direct path ~/.claude/local/claude instead of relying on
 * PATH, since VSCode tasks run in non-login shells that may not have the
 * claude shell alias available.
 */
export const VSCODE_TASKS_TEMPLATE = {
  version: "2.0.0",
  tasks: [
    {
      label: "Start Claude with Handoff",
      type: "shell",
      command: "~/.claude/local/claude",
      args: ["'Read .speck/handoff.md and proceed with the task described there.'"],
      runOptions: {
        runOn: "folderOpen",
      },
      presentation: {
        reveal: "always",
        panel: "dedicated",
        focus: true,
      },
      problemMatcher: [],
    },
  ],
};

/**
 * Hook script template (T049, T050, T050a, T051, T051a)
 *
 * This script:
 * 1. Checks if handoff file exists, exits silently if not
 * 2. Outputs JSON with hookSpecificOutput.additionalContext
 * 3. Uses jq -Rs for safe JSON encoding
 * 4. Archives the handoff file (rename to .done.md)
 * 5. Removes the SessionStart hook from settings.json
 */
export const HANDOFF_HOOK_SCRIPT = `#!/bin/bash

HANDOFF_FILE="$CLAUDE_PROJECT_DIR/.speck/handoff.md"
SETTINGS_FILE="$CLAUDE_PROJECT_DIR/.claude/settings.json"

# Exit silently if no handoff file
[ ! -f "$HANDOFF_FILE" ] && exit 0

# Inject context into Claude session
# Use jq -Rs to properly JSON-escape the content (handles newlines, quotes, etc.)
cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": $(jq -Rs . < "$HANDOFF_FILE")
  }
}
EOF

# Cleanup: Mark handoff as processed
mv "$HANDOFF_FILE" "\${HANDOFF_FILE%.md}.done.md"

# Cleanup: Remove the SessionStart hook from settings.json (one-time use)
if command -v jq &> /dev/null; then
  jq 'del(.hooks.SessionStart)' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && \\
    mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
fi

exit 0
`;

// =============================================================================
// Factory Functions (T045)
// =============================================================================

/**
 * Input options for creating a handoff document
 */
export interface CreateHandoffOptions {
  /** Feature name from spec.md */
  featureName: string;
  /** Git branch name */
  branchName: string;
  /** Relative path to spec.md from worktree */
  specPath: string;
  /** Brief feature description */
  context: string;
  /** Current implementation status (optional) */
  status?: HandoffDocument["status"];
}

/**
 * Create a new handoff document for a feature
 *
 * @param options - Handoff document options
 * @returns HandoffDocument
 * @throws ZodError if validation fails
 */
export function createHandoffDocument(options: CreateHandoffOptions): HandoffDocument {
  const { featureName, branchName, specPath, context, status } = options;

  return HandoffDocumentSchema.parse({
    featureName,
    branchName,
    specPath,
    createdAt: new Date().toISOString(),
    context,
    status,
    nextStep: determineNextStep(status),
  });
}

/**
 * Determine the next step based on current status
 */
function determineNextStep(status?: HandoffDocument["status"]): string {
  switch (status) {
    case "not-started":
      return "Run `/speck.plan` to create an implementation plan, then `/speck.tasks` to generate tasks.";
    case "in-progress":
      return "Run `/speck.implement` to continue working on the remaining tasks.";
    case "completed":
      return "This feature is complete. Run `/speck.analyze` to verify consistency before merging.";
    default:
      return "Start by reviewing the spec, then run `/speck.plan` to create an implementation plan.";
  }
}

// =============================================================================
// Markdown Generation (T046)
// =============================================================================

/**
 * Generate handoff document as Markdown with YAML frontmatter
 *
 * @param doc - Handoff document data
 * @returns Markdown string
 */
export function generateHandoffMarkdown(doc: HandoffDocument): string {
  const statusLine = doc.status ? `status: "${doc.status}"` : "";

  const yamlFrontmatter = `---
featureName: "${escapeYaml(doc.featureName)}"
branchName: "${escapeYaml(doc.branchName)}"
specPath: "${escapeYaml(doc.specPath)}"
createdAt: "${doc.createdAt}"
${statusLine}
---`.trim();

  const markdownContent = `
# Feature Handoff: ${doc.featureName}

## Context

${doc.context}

## Getting Started

1. **Review the spec**: [\`${doc.specPath}\`](${doc.specPath})
2. **Check current tasks**: Run \`/speck.tasks\` if tasks.md doesn't exist
3. **Start implementation**: Run \`/speck.implement\` to execute tasks

## Next Step

${doc.nextStep}

---

*This handoff document was automatically generated. It will be archived after loading.*
`;

  return yamlFrontmatter + "\n" + markdownContent.trim() + "\n";
}

/**
 * Escape special characters for YAML strings
 */
function escapeYaml(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

// =============================================================================
// Markdown Parsing (T047)
// =============================================================================

/**
 * Parse handoff document from Markdown
 *
 * @param markdown - Markdown content with YAML frontmatter
 * @returns Parsed handoff document
 * @throws Error if parsing fails
 */
export function parseHandoffMarkdown(markdown: string): HandoffDocument {
  // Extract YAML frontmatter
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch || !frontmatterMatch[1]) {
    throw new Error("Invalid handoff document: missing YAML frontmatter");
  }

  const yamlContent = frontmatterMatch[1];
  const frontmatter: Record<string, string> = {};

  // Simple YAML parsing (key: "value" format)
  for (const line of yamlContent.split("\n")) {
    const match = line.match(/^(\w+):\s*"?([^"]*)"?$/);
    if (match && match[1] !== undefined && match[2] !== undefined) {
      frontmatter[match[1]] = match[2];
    }
  }

  // Extract context from markdown body
  const body = markdown.slice(frontmatterMatch[0].length);
  const contextMatch = body.match(/## Context\n\n([\s\S]*?)\n\n## Getting Started/);
  const context = contextMatch && contextMatch[1] ? contextMatch[1].trim() : "";

  // Extract next step from markdown body
  const nextStepMatch = body.match(/## Next Step\n\n([\s\S]*?)\n\n---/);
  const nextStep = nextStepMatch && nextStepMatch[1] ? nextStepMatch[1].trim() : "";

  // Build and validate document
  const doc = {
    featureName: frontmatter.featureName || "",
    branchName: frontmatter.branchName || "",
    specPath: frontmatter.specPath || "",
    createdAt: frontmatter.createdAt || "",
    status: frontmatter.status as HandoffDocument["status"],
    context,
    nextStep,
  };

  return HandoffDocumentSchema.parse(doc);
}

// =============================================================================
// Hook Output Generation (T050)
// =============================================================================

/**
 * Generate hook JSON output with additionalContext
 *
 * @param handoffContent - The handoff markdown content
 * @returns JSON string for hook output
 */
export function generateHookOutput(handoffContent: string): string {
  const output = {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: handoffContent,
    },
  };
  return JSON.stringify(output);
}

// =============================================================================
// Handoff Archival (T051)
// =============================================================================

/**
 * Archive the handoff file by renaming to .done.md
 *
 * @param worktreePath - Path to the worktree
 */
export function archiveHandoff(worktreePath: string): void {
  const handoffPath = path.join(worktreePath, HANDOFF_FILE_PATH);
  const archivedPath = path.join(worktreePath, HANDOFF_DONE_PATH);

  if (!existsSync(handoffPath)) {
    return; // Nothing to archive
  }

  renameSync(handoffPath, archivedPath);
}

// =============================================================================
// Hook Self-Cleanup (T051a)
// =============================================================================

/**
 * Remove the SessionStart hook from settings.json
 *
 * @param worktreePath - Path to the worktree
 */
export function removeSessionStartHook(worktreePath: string): void {
  const settingsPath = path.join(worktreePath, CLAUDE_SETTINGS_PATH);

  if (!existsSync(settingsPath)) {
    return; // Nothing to clean up
  }

  try {
    const content = readFileSync(settingsPath, "utf-8");
    const settings = JSON.parse(content) as Record<string, unknown>;

    const hooks = settings.hooks as Record<string, unknown> | undefined;
    if (hooks?.SessionStart) {
      delete hooks.SessionStart;

      // Remove empty hooks object
      if (Object.keys(hooks).length === 0) {
        delete settings.hooks;
      }

      writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    }
  } catch {
    // Ignore errors during cleanup
  }
}

// =============================================================================
// Worktree Handoff Writing (T048a-d)
// =============================================================================

/**
 * Options for writing worktree handoff
 */
export interface WriteWorktreeHandoffOptions {
  /** Feature name from spec.md */
  featureName: string;
  /** Git branch name */
  branchName: string;
  /** Relative path to spec.md from worktree */
  specPath: string;
  /** Brief feature description */
  context: string;
  /** Current implementation status (optional) */
  status?: HandoffDocument["status"];
}

/**
 * Write all handoff artifacts to a worktree
 *
 * @param worktreePath - Path to the worktree
 * @param options - Handoff options
 */
export function writeWorktreeHandoff(
  worktreePath: string,
  options: WriteWorktreeHandoffOptions
): void {
  // T048a: Write .speck/handoff.md
  const doc = createHandoffDocument(options);
  const markdown = generateHandoffMarkdown(doc);

  const speckDir = path.join(worktreePath, ".speck");
  mkdirSync(speckDir, { recursive: true });
  writeFileSync(path.join(worktreePath, HANDOFF_FILE_PATH), markdown);

  // T048c: Write .claude/settings.json with SessionStart hook
  const claudeDir = path.join(worktreePath, ".claude");
  mkdirSync(claudeDir, { recursive: true });
  writeFileSync(
    path.join(worktreePath, CLAUDE_SETTINGS_PATH),
    JSON.stringify(CLAUDE_SETTINGS_TEMPLATE, null, 2)
  );

  // T048b: Write .claude/scripts/handoff.sh
  const scriptsDir = path.join(worktreePath, ".claude", "scripts");
  mkdirSync(scriptsDir, { recursive: true });
  const hookScriptPath = path.join(worktreePath, HOOK_SCRIPT_PATH);
  writeFileSync(hookScriptPath, HANDOFF_HOOK_SCRIPT);
  chmodSync(hookScriptPath, 0o755); // Make executable

  // T048d: Write .vscode/tasks.json
  const vscodeDir = path.join(worktreePath, ".vscode");
  mkdirSync(vscodeDir, { recursive: true });
  writeFileSync(
    path.join(worktreePath, VSCODE_TASKS_PATH),
    JSON.stringify(VSCODE_TASKS_TEMPLATE, null, 2)
  );
}

// =============================================================================
// Complete Worktree Creation with Handoff (T048)
// =============================================================================

/**
 * Options for creating a worktree with handoff
 */
export interface CreateWorktreeWithHandoffOptions {
  /** Path to the main repository */
  repoPath: string;
  /** Git branch name */
  branchName: string;
  /** Path where worktree should be created */
  worktreePath: string;
  /** Feature name from spec.md */
  featureName: string;
  /** Relative path to spec.md from worktree */
  specPath: string;
  /** Brief feature description */
  context: string;
  /** Current implementation status (optional) */
  status?: HandoffDocument["status"];
}

/**
 * Result of worktree creation with handoff
 */
export interface CreateWorktreeWithHandoffResult {
  /** Whether the worktree was successfully created */
  success: boolean;
  /** Path to the created worktree */
  worktreePath: string;
  /** Warnings that occurred during creation (non-fatal) */
  warnings?: string[];
  /** Error message if creation failed */
  error?: string;
}

/**
 * Create a worktree with session handoff (atomic git worktree add)
 *
 * Uses `git worktree add -b` for atomic branch+worktree creation
 * without changing the original repo checkout.
 *
 * @param options - Worktree creation options
 * @returns Result of creation operation
 */
export async function createWorktreeWithHandoff(
  options: CreateWorktreeWithHandoffOptions
): Promise<CreateWorktreeWithHandoffResult> {
  const {
    repoPath,
    branchName,
    worktreePath,
    featureName,
    specPath,
    context,
    status,
  } = options;

  const warnings: string[] = [];

  try {
    // T048: Use atomic git worktree add (no checkout switching)
    // Check if branch already exists
    const branchCheck = await $`git -C ${repoPath} rev-parse --verify ${branchName}`.nothrow().quiet();

    if (branchCheck.exitCode === 0) {
      // Branch exists, add worktree for existing branch
      const result = await $`git -C ${repoPath} worktree add ${worktreePath} ${branchName}`.nothrow();
      if (result.exitCode !== 0) {
        return {
          success: false,
          worktreePath,
          error: `Failed to create worktree: ${result.stderr.toString()}`,
        };
      }
    } else {
      // Branch doesn't exist, create branch and worktree atomically
      const result = await $`git -C ${repoPath} worktree add -b ${branchName} ${worktreePath} HEAD`.nothrow();
      if (result.exitCode !== 0) {
        return {
          success: false,
          worktreePath,
          error: `Failed to create worktree with branch: ${result.stderr.toString()}`,
        };
      }
    }

    // T054: Graceful degradation - try to write handoff, but don't fail if it errors
    try {
      writeWorktreeHandoff(worktreePath, {
        featureName,
        branchName,
        specPath,
        context,
        status,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      warnings.push(`Failed to write handoff artifacts: ${errorMessage}`);
    }

    return {
      success: true,
      worktreePath,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      worktreePath,
      error: `Worktree creation failed: ${errorMessage}`,
    };
  }
}
