---
description: Generate an actionable, dependency-ordered tasks.md for the feature based on available design artifacts.
handoffs:
  - label: Analyze For Consistency
    agent: speck.analyze
    prompt: Run a project analysis for consistency
    send: true
  - label: Implement Project
    agent: speck.implement
    prompt: Start the implementation in phases
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Flag Support

This command supports the following flags for branch-aware task generation (US4):

- `--branch <name>`: Generate tasks for specific branch (requires stacked PR mode)
- `--stories <US1,US2>`: Filter to specific user stories (comma-separated)

**Examples**:
```bash
/speck:tasks --branch username/db-layer --stories US1
/speck:tasks --stories US1,US2
/speck:tasks --branch username/api
```

## Outline

1. **Parse flags from $ARGUMENTS** (T050-T054):
   - Check for `--branch <name>` flag and extract branch name
   - Check for `--stories <US1,US2>` flag and extract comma-separated story IDs
   - If `--branch` provided: Load `.speck/branches.json` (T052) and validate branch exists (T053)
   - If `--stories` provided: Store story IDs for filtering (will validate against spec.md later) (T054)

2. **Setup**: Extract prerequisite context from the auto-injected comment in the prompt:
   ```
   <!-- SPECK_PREREQ_CONTEXT
   {"MODE":"multi-repo","FEATURE_DIR":"/path/to/root-repo/specs/010-feature","IMPL_PLAN":"/path/to/child-repo/specs/010-feature/plan.md","TASKS":"/path/to/child-repo/specs/010-feature/tasks.md","REPO_ROOT":"/path/to/child-repo","AVAILABLE_DOCS":["../../../8-specs/specs/010-feature/spec.md","specs/010-feature/plan.md","specs/010-feature/research.md"]}
   -->
   ```

   **Path Usage**:
   - `FEATURE_DIR`: Directory containing shared artifacts (spec.md, research.md, data-model.md, plan.md in multi-repo mode) - **READ ONLY**
   - `IMPL_PLAN`: Full path to plan.md (for reading in multi-repo mode)
   - `TASKS`: Full path where tasks.md should be written - **WRITE HERE**
   - `REPO_ROOT`: Root directory of current repository (for relative path calculations)
   - `MODE`: "single-repo" or "multi-repo" (child in multi-repo setup)

   **Multi-repo behavior**:
   - In single-repo mode: FEATURE_DIR and TASKS point to same directory
   - In multi-repo mode: FEATURE_DIR points to root repo (shared), TASKS points to child repo (local)

   Use the FEATURE_DIR and AVAILABLE_DOCS values from this JSON.

   **Fallback**: If the comment is not present (VSCode hook bug), run:
   ```bash
   speck check-prerequisites --json
   ```

   **Fallback (VSCode hook bug)**: If the virtual command fails with exit code 127, run:
   ```bash
   bun ~/.claude/plugins/marketplaces/speck-market/speck/scripts/check-prerequisites.ts --json
   ```
   Then manually parse the JSON output to extract FEATURE_DIR, AVAILABLE_DOCS, MODE, and other fields.

3. **Load design documents**:
   Use Read tool to load files from the paths in AVAILABLE_DOCS:
   - Iterate through AVAILABLE_DOCS array and use Read tool for each file
   - AVAILABLE_DOCS contains relative paths from REPO_ROOT (e.g., "specs/010-feature/plan.md" or "../../../8-specs/specs/010-feature/spec.md")
   - Use Glob if you need to find additional files (e.g., contracts/*.json)

   **Required files**: plan.md (tech stack, libraries, structure), spec.md (user stories with priorities)
   **Optional files**: data-model.md (entities), contracts/ (API endpoints), research.md (decisions), quickstart.md (test scenarios)
   Note: Not all projects have all documents. Generate tasks based on what's available.

4. **Execute task generation workflow**:
   - Load plan.md and extract tech stack, libraries, project structure
   - Load spec.md and extract user stories with their priorities (P1, P2, P3, etc.)
   - **If `--stories` flag provided** (T055-T056):
     - Parse story IDs from flag (e.g., "US1,US2" → ["US1", "US2"])
     - Validate each story ID exists in spec.md (T055)
     - Filter user stories to only include requested IDs (T056)
   - **If `--stories` flag NOT provided**: Use all user stories from spec.md
   - If data-model.md exists: Extract entities and map to user stories
   - If contracts/ exists: Map endpoints to user stories
   - If research.md exists: Extract decisions for setup tasks
   - **Task generation strategy** (T057):
     - If `--stories` flag used: Skip Setup/Foundational phases, generate only requested story tasks
     - If `--stories` flag NOT used: Generate all phases (Setup, Foundational, all user stories, Polish)
   - Generate tasks organized by user story (see Task Generation Rules below)
   - Generate dependency graph showing user story completion order
   - Create parallel execution examples per user story
   - Validate task completeness (each user story has all needed tasks, independently testable)

5. **Generate tasks.md** (T058): Use `${CLAUDE_PLUGIN_ROOT}/templates/tasks-template.md` as structure, fill with:
   - **Output file path**:
     - **IMPORTANT**: Use TASKS path from prerequisite context, NOT FEATURE_DIR
     - If `--branch` flag provided: Replace `.md` extension in TASKS path with `-<branch-name>.md`
     - If `--branch` flag NOT provided: Use TASKS path as-is (default)
     - In multi-repo mode, TASKS points to child repo, FEATURE_DIR points to root repo
   - Correct feature name from plan.md
   - Phase 1: Setup tasks (project initialization)
   - Phase 2: Foundational tasks (blocking prerequisites for all user stories)
   - Phase 3+: One phase per user story (in priority order from spec.md)
   - Each phase includes: story goal, independent test criteria, tests (if requested), implementation tasks
   - Final Phase: Polish & cross-cutting concerns
   - All tasks must follow the strict checklist format (see Task Generation Rules below)
   - Clear file paths for each task
   - Dependencies section showing story completion order
   - Parallel execution examples per story
   - Implementation strategy section (MVP first, incremental delivery)

6. **Report** (T059): Output path to generated tasks.md and summary:
   - File path (either `tasks.md` or `tasks-<branch-name>.md`)
   - If `--branch` flag used: Display branch name and spec ID
   - If `--stories` flag used: Display filtered story IDs
   - Total task count
   - Task count per user story
   - Parallel opportunities identified
   - Independent test criteria for each story
   - Suggested MVP scope (typically just User Story 1)
   - Format validation: Confirm ALL tasks follow the checklist format (checkbox, ID, labels, file paths)

Context for task generation: $ARGUMENTS

The tasks.md should be immediately executable - each task must be specific enough that an LLM can complete it without additional context.

## Task Generation Rules

**CRITICAL**: Tasks MUST be organized by user story to enable independent implementation and testing.

**Tests are OPTIONAL**: Only generate test tasks if explicitly requested in the feature specification or if user requests TDD approach.

### Checklist Format (REQUIRED)

Every task MUST strictly follow this format:

```text
- [ ] [TaskID] [P?] [Story?] Description with file path
```

**Format Components**:

1. **Checkbox**: ALWAYS start with `- [ ]` (markdown checkbox)
2. **Task ID**: Sequential number (T001, T002, T003...) in execution order
3. **[P] marker**: Include ONLY if task is parallelizable (different files, no dependencies on incomplete tasks)
4. **[Story] label**: REQUIRED for user story phase tasks only
   - Format: [US1], [US2], [US3], etc. (maps to user stories from spec.md)
   - Setup phase: NO story label
   - Foundational phase: NO story label
   - User Story phases: MUST have story label
   - Polish phase: NO story label
5. **Description**: Clear action with exact file path

**Examples**:

- ✅ CORRECT: `- [ ] T001 Create project structure per implementation plan`
- ✅ CORRECT: `- [ ] T005 [P] Implement authentication middleware in src/middleware/auth.py`
- ✅ CORRECT: `- [ ] T012 [P] [US1] Create User model in src/models/user.py`
- ✅ CORRECT: `- [ ] T014 [US1] Implement UserService in src/services/user_service.py`
- ❌ WRONG: `- [ ] Create User model` (missing ID and Story label)
- ❌ WRONG: `T001 [US1] Create model` (missing checkbox)
- ❌ WRONG: `- [ ] [US1] Create User model` (missing Task ID)
- ❌ WRONG: `- [ ] T001 [US1] Create model` (missing file path)

### Task Organization

1. **From User Stories (spec.md)** - PRIMARY ORGANIZATION:
   - Each user story (P1, P2, P3...) gets its own phase
   - Map all related components to their story:
     - Models needed for that story
     - Services needed for that story
     - Endpoints/UI needed for that story
     - If tests requested: Tests specific to that story
   - Mark story dependencies (most stories should be independent)

2. **From Contracts**:
   - Map each contract/endpoint → to the user story it serves
   - If tests requested: Each contract → contract test task [P] before implementation in that story's phase

3. **From Data Model**:
   - Map each entity to the user story(ies) that need it
   - If entity serves multiple stories: Put in earliest story or Setup phase
   - Relationships → service layer tasks in appropriate story phase

4. **From Setup/Infrastructure**:
   - Shared infrastructure → Setup phase (Phase 1)
   - Foundational/blocking tasks → Foundational phase (Phase 2)
   - Story-specific setup → within that story's phase

### Phase Structure

- **Phase 1**: Setup (project initialization)
- **Phase 2**: Foundational (blocking prerequisites - MUST complete before user stories)
- **Phase 3+**: User Stories in priority order (P1, P2, P3...)
  - Within each story: Tests (if requested) → Models → Services → Endpoints → Integration
  - Each phase should be a complete, independently testable increment
- **Final Phase**: Polish & Cross-Cutting Concerns
