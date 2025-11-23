# Speck Knowledge Usage Examples

Practical examples showing how the speck-knowledge skill interprets and answers questions about Speck artifacts.

**Referenced from**: SKILL.md

---

## Example 1: Ask About Requirements
```
User: What are the functional requirements for feature 005?

Skill Actions:
1. Parse query → feature "005" (Tier 2: numeric match)
2. Pad to "005", match specs/005-speck-skill/
3. Load specs/005-speck-skill/spec.md
4. Extract Requirements section
5. Parse FR-XXX items
6. Return list

Response:
  Feature 005 (Speck Workflow Skill) has 12 functional requirements:

  FR-001: Skill automatically activates when users ask questions about Speck features
  FR-002: Skill interprets spec.md structure and extracts user stories
  FR-003: Skill interprets spec.md structure and extracts requirements
  ... [etc]
```

---

## Example 2: Check Task Status
```
User: How many tasks are completed for the speck skill?

Skill Actions:
1. Parse query → "speck skill" (Tier 3: fuzzy match)
2. Find specs/005-speck-skill/
3. Load specs/005-speck-skill/tasks.md
4. Count `- [x]` (completed) and `- [ ]` (pending)
5. Calculate percentage

Response:
  Feature 005-speck-skill: 0/47 tasks completed (0%)

  Current phase: Phase 1 - Setup (0/3 tasks done)
  Next task: T001 - Create .claude/skills/speck-workflow.md with YAML frontmatter structure
```

---

## Example 3: Compare Against Template
```
User: Does my spec for feature 005 follow the template?

Skill Actions:
1. Load $PLUGIN_ROOT/templates/spec-template.md
2. Load specs/005-speck-skill/spec.md
3. Extract sections from both
4. Compare mandatory sections
5. Generate comparison report

Response:
  Template Comparison: specs/005-speck-skill/spec.md vs spec-template.md
  ┌──────────────────────────────────────────────────────────────┐
  │ Structure: 100% match                                        │
  ├──────────────────────────────────────────────────────────────┤
  │ ✅ Present: All mandatory sections                           │
  │   - User Scenarios & Testing                                 │
  │   - Requirements (Functional Requirements, Key Entities)     │
  │   - Success Criteria (Measurable Outcomes)                   │
  ├──────────────────────────────────────────────────────────────┤
  │ Completeness: 100% (5/5 mandatory sections)                 │
  │                                                              │
  │ ✓ Spec is ready for planning                                │
  └──────────────────────────────────────────────────────────────┘
```

---

## Example 4: Handle Missing File
```
User: What's in the tasks.md for feature 003?

Skill Actions:
1. Parse query → feature "003" (Tier 2: numeric match)
2. Attempt to load specs/003-user-auth/tasks.md
3. File not found (State: MISSING)
4. Generate error with recovery guidance

Response:
  ERROR: Tasks Not Found
  ┌────────────────────────────────────────────────────┐
  │ tasks.md not found at specs/003-user-auth/         │
  ├────────────────────────────────────────────────────┤
  │ Recovery: Run /speck.tasks to generate tasks       │
  └────────────────────────────────────────────────────┘
```

---

## Example 5: Explain Section Purpose
```
User: What should go in the Success Criteria section?

Skill Actions:
1. Detect question about section purpose
2. Load $PLUGIN_ROOT/templates/spec-template.md
3. Find "Success Criteria" section
4. Extract HTML comment
5. Parse guidelines

Response:
  Purpose of Success Criteria section:
  "Define measurable outcomes that indicate feature completion. Each criterion should have a specific metric and be technology-agnostic."

  Guidelines:
  - Use format: **SC-XXX**: Description
  - Must be measurable (include percentages, counts, or clear pass/fail)
  - No implementation details (focus on what, not how)
  - Each criterion should be independently verifiable

  Example:
    **SC-001**: 95% accuracy in answering natural language questions about spec.md files
    **SC-002**: 100% accuracy in extracting all sections from valid spec files
```

---

## Example 6: Multi-Repo Mode Detection
```
User: Is this a multi-repo setup?

Skill Actions:
1. Check for .speck/root symlink
2. If exists, read symlink target
3. Determine mode (multi-repo child vs single-repo)

Response:
  Yes, this is a multi-repo child repository.

  Detection:
  - Found .speck/root symlink → ../../
  - Speck root: /Users/nathan/git/github.com/nprbst/
  - Current repo: /Users/nathan/git/github.com/nprbst/speck/

  Configuration:
  - Shared specs/ directory from root repo
  - Local plan.md and tasks.md (per-repo)
  - Constitution: Check .speck/constitution.md or root repo

  To link a child repo: Run /speck.link <path-to-root>
```

---

## Example 7: Stacked PR Branch Status
```
User: Which branches exist for feature 007?

Skill Actions:
1. Load .speck/branches.json
2. Filter branches by specId "007-multi-repo-monorepo-support"
3. Parse branch relationships and status

Response:
  Feature 007-multi-repo-monorepo-support has 2 stacked branches:

  Branch Stack:
  main
  └── 007-multi-repo (PR #5, merged)
      └── nprbst/db-layer (active, no PR yet)

  Details:
  - 007-multi-repo: Base branch for feature, merged to main
  - nprbst/db-layer: Active development, stacked on 007-multi-repo

  Workflow Mode: stacked-pr (from plan.md)

  Next steps:
  - Create PR for nprbst/db-layer with base 007-multi-repo
  - Use /speck.branch create to add more branches
```

---

## Example 8: Virtual Command Performance
```
User: Why are Speck commands so fast?

Skill Actions:
1. Explain virtual command pattern
2. Describe hook-based architecture
3. Detail performance characteristics

Response:
  Speck commands execute in <100ms due to the virtual command pattern:

  Architecture:
  1. PrePromptSubmit hook runs on every user message
     - Automatically checks prerequisites (feature dir, git status)
     - Pre-loads context and injects into prompt
     - No manual prerequisite checks needed

  2. PreToolUse hook intercepts command execution
     - Routes speck-* commands to unified CLI handler
     - Path-independent execution (no hardcoded paths)
     - Returns transformed command with context

  Performance Benefits:
  - Hook routing: <100ms latency
  - Prerequisite caching: 30% faster execution
  - Context pre-loading: No redundant checks

  Dual-Mode Execution:
  - Works in Claude Code (via hooks)
  - Works in CLI (via bun run .speck/scripts/*.ts)
  - Same codebase, different I/O (JSON vs terminal)

  Examples:
  - /speck.env: Instant environment check (prerequisites cached)
  - /speck.branch list: Fast branch listing (context pre-loaded)
```

---

## Example 9: Worktree Configuration
```
User: What's the worktree config for this feature?

Skill Actions:
1. Load .speck/config.json
2. Extract worktree section
3. Check for worktree metadata in .speck/worktrees/

Response:
  Worktree integration is enabled for this repository.

  Configuration (.speck/config.json):
  - Worktree creation: enabled
  - Auto-launch IDE: VSCode (vscode)
  - Install dependencies: Yes (automatic npm/yarn/bun install)
  - Branch prefix: specs/

  File Management Rules:
  - Copy (isolated): .env*, *.config.{js,ts}
  - Symlink (shared): node_modules, .bun

  Active Worktrees:
  - 012-worktree-integration → ../speck-012-worktree-integration/
    Created: 2025-11-22T10:00:00Z
    Status: active

  Worktree Naming:
  - Repo directory: speck/
  - Branch: 012-worktree-integration
  - Worktree path: speck-012-worktree-integration/ (peer directory)

  To create worktree: Run /speck.specify with default flags
  To skip worktree: Use --no-worktree flag
```
