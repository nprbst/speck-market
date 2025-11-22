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
   {"MODE":"single-repo","FEATURE_DIR":"/path/to/specs/010-feature","AVAILABLE_DOCS":["spec.md"],"FILE_CONTENTS":{"spec.md":"...","constitution.md":"..."}}
   -->
   ```
   Use FEATURE_DIR and FILE_CONTENTS from this JSON.

   **FILE_CONTENTS field**: Contains pre-loaded file contents. Possible values:
   - Full file content (string): File was successfully pre-loaded
   - `"NOT_FOUND"`: File does not exist
   - `"TOO_LARGE"`: File exceeds size limits (use Read tool instead)

   Pre-loaded files: `spec.md`, `constitution.md`

   **Check FILE_CONTENTS from prerequisite context first**:
   - For spec.md, constitution.md:
     - If FILE_CONTENTS[filename] exists and is NOT `"NOT_FOUND"` or `"TOO_LARGE"`: Use the pre-loaded content
     - If FILE_CONTENTS[filename] is `"TOO_LARGE"`: Use Read tool to load the file
     - If FILE_CONTENTS[filename] is `"NOT_FOUND"`: Skip this file (error if required)
     - If FILE_CONTENTS field is not present: Use Read tool (backwards compatibility)

   **Fallback**: If the comment is not present (backwards compatibility), run:
   ```bash
   speck-setup-plan --json
   ```
   Parse JSON for FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH.

2. **Load context**:
   - Read spec.md from FILE_CONTENTS (step 1) or using Read tool if needed
   - Read constitution.md from FILE_CONTENTS (step 1) or using Read tool if needed
   - Load plan.md template (always use Read - not pre-loaded)

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

4. **Stop and report**: Command ends after Phase 2 planning. Report branch, IMPL_PLAN path, and generated artifacts.

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

**Output**: research.md with all NEEDS CLARIFICATION resolved

### Phase 1: Design & Contracts

**Prerequisites:** `research.md` complete

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Agent context update**:
   - Run `speck-update-agent-context claude`
   - These scripts detect which AI agent is in use
   - Update the appropriate agent-specific context file
   - Add only new technology from current plan
   - Preserve manual additions between markers

**Output**: data-model.md, /contracts/*, quickstart.md, agent-specific file

## Key rules

- Use absolute paths
- ERROR on gate failures or unresolved clarifications
