---
description: Execute the implementation planning workflow using the plan template to generate design artifacts.
handoffs:
  - label: Create Tasks
    agent: speck.tasks
    prompt: Break the plan into tasks
    send: true
  - label: Create Checklist
    agent: speck.checklist
    prompt: Create a checklist for the following domain...
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Workflow Mode Detection

Parse command-line flags from user input:
- `--stacked`: Enable stacked PR workflow mode (write workflow metadata to plan.md)
- If no flag provided: Default to single-branch mode (no workflow metadata written)

## Outline

1. **Setup**: Extract prerequisite context from the auto-injected comment in the prompt:
   ```
   <!-- SPECK_PREREQ_CONTEXT
   {"MODE":"multi-repo","FEATURE_DIR":"/path/to/root-repo/specs/010-feature","IMPL_PLAN":"/path/to/child-repo/specs/010-feature/plan.md","TASKS":"/path/to/child-repo/specs/010-feature/tasks.md","REPO_ROOT":"/path/to/child-repo","TEMPLATE_DIR":"/path/to/plugin/templates","AVAILABLE_DOCS":["../../../8-specs/specs/010-feature/spec.md",".speck/memory/constitution.md"]}
   -->
   ```

   **Path Usage**:
   - `FEATURE_DIR`: Directory containing shared artifacts (spec.md, research.md, data-model.md) - **READ ONLY**
   - `IMPL_PLAN`: Full path where plan.md should be written - **WRITE HERE**
   - `TASKS`: Full path where tasks.md should be written (used by /speck:tasks)
   - `REPO_ROOT`: Root directory of current repository (for relative path calculations)
   - `TEMPLATE_DIR`: Directory containing templates (plan-template.md, spec-template.md, etc.) - **USE FOR TEMPLATES**
   - `MODE`: "single-repo" or "multi-repo" (child in multi-repo setup)

   **Multi-repo behavior**:
   - In single-repo mode: FEATURE_DIR, IMPL_PLAN, and TASKS all point to same directory
   - In multi-repo mode: FEATURE_DIR points to root repo (shared), IMPL_PLAN/TASKS point to child repo (local)

   **Fallback**: If the comment is not present (VSCode hook bug), run:
   ```bash
   speck setup-plan --json
   ```
   Parse JSON for FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH.

   Then parse the JSON output to extract FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, and BRANCH.

2. **Load context** (use Read tool for all files):
   - **Read** spec.md and constitution.md from paths in AVAILABLE_DOCS
   - **Read** plan template from `{TEMPLATE_DIR}/plan-template.md` (e.g., `/Users/.../.claude/plugins/.../templates/plan-template.md`)

3. **Execute plan workflow**: Follow the structure in IMPL_PLAN template to:
   - Fill Technical Context (mark unknowns as "NEEDS CLARIFICATION")
   - **If --stacked flag provided**: Add workflow mode metadata to plan.md header
     - After the "Feature Branch:", "Spec:", "Status:", "Created:" lines in plan.md header
     - Insert line: `**Workflow Mode**: stacked-pr`
     - Analyze user stories in spec.md to suggest groupings:
       - Group related user stories that could be implemented in sequence
       - Example: US1,US2 (database layer) → US3,US4 (API layer) → US5,US6 (UI layer)
     - Add section to plan.md (after Executive Summary):
       ```markdown
       ## User Story Groupings

       **Suggested Stacking Strategy**:
       - Branch 1: US1, US2 (Database layer)
       - Branch 2: US3, US4 (API endpoints)
       - Branch 3: US5, US6 (UI components)

       These groupings represent natural boundaries for stacked PRs. Each group can be implemented in a separate branch with its own pull request.
       ```
   - Fill Constitution Check section from constitution
   - Evaluate gates (ERROR if violations unjustified)
   - Phase 0: Generate research.md (resolve all NEEDS CLARIFICATION)
   - Phase 1: Generate data-model.md, contracts/, quickstart.md
   - Phase 1: Update agent context by running the agent script
   - Re-evaluate Constitution Check post-design

4. **Write plan.md**: Use the IMPL_PLAN path from prerequisite context to write plan.md file.
   - **IMPORTANT**: Write to IMPL_PLAN path, NOT to FEATURE_DIR/plan.md
   - In multi-repo mode, IMPL_PLAN points to child repo, FEATURE_DIR points to root repo

5. **Stop and report**: Command ends after Phase 2 planning. Report branch, IMPL_PLAN path, and generated artifacts.

## Phases

### Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:

   ```text
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]
   - **Write to**: `{REPO_ROOT}/specs/{feature}/research.md` (local to child repo - each repo does its own research)

**Output**: research.md with all NEEDS CLARIFICATION resolved

### Phase 1: Design & Contracts

**Prerequisites:** `research.md` complete

**Before generating contracts**: Check for existing shared contracts
1. If `{FEATURE_DIR}/contracts/` exists and contains files:
   - Read all contract files in that directory
   - Use these as constraints for planning (the API is already defined)
   - Do NOT regenerate contracts - skip to step 3
2. If no contracts exist, proceed to generate them below

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable
   - **Write to**: `{REPO_ROOT}/specs/{feature}/data-model.md` (local to child repo - each repo has its own data model)

2. **Generate API contracts** from functional requirements (only if no shared contracts exist):
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - **Write to**: `{FEATURE_DIR}/contracts/` (shared - goes to root repo, accessible to all child repos)

3. **Generate quickstart.md** with developer setup instructions:
   - Prerequisites (runtime versions, dependencies)
   - Installation steps
   - Development commands (start, test, build)
   - Project structure overview
   - Common tasks and workflows
   - **Write to**: `{REPO_ROOT}/specs/{feature}/quickstart.md` (local to child repo)

4. **Agent context update**:
   - Run `speck update-agent-context`
   - These scripts detect which AI agent is in use
   - Update the appropriate agent-specific context file
   - Add only new technology from current plan
   - Preserve manual additions between markers

**Output**: data-model.md (local), contracts/* (shared, if created), quickstart.md (local), agent-specific file

## Key rules

- Use absolute paths
- ERROR on gate failures or unresolved clarifications
