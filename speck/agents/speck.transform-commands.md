# Agent: Transform Commands (speckit → speck)

**Purpose**: Transform upstream `/speckit.*` slash commands into `/speck.*`
commands, adapting script references from bash to Bun TypeScript.

**Invoked by**: `/speck.transform-upstream` command

**Input**: Path to command markdown files in
`upstream/<version>/templates/commands/`

**Output**: Transformed `/speck.*` command files in `.claude/commands/`

---

## Optimization: Diff-Aware Processing

**IMPORTANT**: The invoking command will provide context about which speckit
commands have CHANGED since the previous upstream version.

### Context Variables

When invoked, you will receive:

- **UPSTREAM_VERSION**: The version being transformed (e.g., `v0.0.84`)
- **PREVIOUS_VERSION**: The last successfully transformed version (e.g.,
  `v0.0.83`), or `"none"` for first transformation
- **CHANGED_SPECKIT_COMMANDS**: List of ONLY the speckit commands that are new
  or modified
- **BASH_TO_BUN_MAPPINGS**: FULL list of all bash→bun script mappings (commands
  may reference any script)

### Processing Rules

1. **If PREVIOUS_VERSION is "none"**: Transform ALL speckit commands (first-time
   transformation)

2. **If PREVIOUS_VERSION exists**:
   - **ONLY process commands in CHANGED_SPECKIT_COMMANDS list**
   - **Skip all other commands entirely** - they're already transformed and
     unchanged
   - Report skipped commands in the JSON output

3. **For each changed command**:
   - Check if a `/speck.X.md` file already exists in `.claude/commands/`
   - If exists: **UPDATE** the existing file (preserve [SPECK-EXTENSION]
     markers)
   - If new: **CREATE** a new `/speck.X.md` file

---

## Transformation Rules

### 1. Command Naming

```
/speckit.plan        → /speck.plan
/speckit.tasks       → /speck.tasks
/speckit.implement   → /speck.implement
```

**File naming**: `upstream/.../commands/plan.md` →
`.claude/commands/speck.plan.md`

### 2. Script References

**Before**:

```yaml
---
scripts:
  sh: scripts/bash/setup-plan.sh --json
  ps: scripts/powershell/setup-plan.ps1 -Json
---
```

**After**:

```yaml
---
scripts:
  sh: .speck/scripts/setup-plan.ts --json
---
```

**Rules**:

- Remove PowerShell references
- Update bash paths: `scripts/bash/X.sh` → `.speck/scripts/X.ts`
- Preserve all CLI flags

### 3. Agent Script References

**Before**:

```yaml
agent_scripts:
  sh: scripts/bash/update-agent-context.sh __AGENT__
```

**After**:

```yaml
agent_scripts:
  sh: .speck/scripts/update-agent-context.ts __AGENT__
```

### 4. Handoff References

**Before**:

```yaml
handoffs:
  - label: Create Tasks
    agent: speckit.tasks
    prompt: Break the plan into tasks
```

**After**:

```yaml
handoffs:
  - label: Create Tasks
    agent: speck.tasks
    prompt: Break the plan into tasks
```

Replace `speckit.` with `speck.` in agent names only.

### 5. Command Body

1. **Preserve all workflow steps** - keep instruction logic identical
2. **Update path references**: `scripts/bash/` → `.speck/scripts/`
3. **Preserve `{SCRIPT}` and `{AGENT_SCRIPT}` placeholders** - unchanged
4. **Preserve [SPECK-EXTENSION:START/END] markers** - copy verbatim

---

## Command Body Analysis for Factoring

**Purpose**: Analyze `/speckit.*` command body content to identify workflow sections that should be extracted into agents or skills per FR-007 criteria.

### Analysis Approach

For each command being transformed:

1. **Read the command body** (everything after the frontmatter `---` block)
2. **Identify workflow sections** by looking for:
   - Numbered step sequences (`1. Step one, 2. Step two...`)
   - Procedural instructions with multiple stages
   - Conditional logic (`if X then Y`, `when Z, do W`)
   - Branching decision points (`Option A vs Option B`)
3. **Count complexity indicators**:
   - How many distinct steps? (>3 suggests extraction candidate)
   - Does it have branching logic? (if/then/else, multiple options)
   - Is it reusable across commands? (suggests skill extraction)
   - Is it command-specific? (keep inline even if complex)
4. **Apply FR-007 factoring criteria**:
   - **Agent** (`create .claude/agents/X.md`): Multi-step autonomous workflow with >3 steps AND branching logic
   - **Skill** (`create .claude/skills/X.md`): Reusable capability used by multiple commands
   - **Inline** (keep in command body): Simple sequential procedures, <3 steps, or command-specific logic

### Factoring Examples

**Example 1: Extract to Agent** (meets FR-007 agent criteria)

**Source** (`/speckit.plan.md` Outline section):
```markdown
## Outline

1. Run `{SCRIPT}` to get feature paths
2. Load feature spec and constitution
3. Check constitution compliance - if violations, prompt user resolution
4. Generate research.md
5. Generate data-model.md
6. If entities exist, generate contracts/ and test utilities
7. Generate quickstart.md
8. Save artifacts
9. Present handoff to next command
```

**Analysis**: 9 steps, has branching (step 3 user prompt, step 6 conditional), autonomous workflow
**Decision**: Extract steps 2-8 to `.claude/agents/plan-workflow.md`, keep steps 1 and 9 inline (script invocation and handoff)

**Example 2: Keep Inline** (simple sequential)

**Source** (`/speckit.tasks.md` User Input section):
```markdown
## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding.
```

**Analysis**: 1 step, no branching, boilerplate
**Decision**: Keep inline - too simple to extract

**Example 3: Extract to Skill** (reusable capability)

If you notice the same pattern appears in multiple commands (e.g., "Load feature context: read spec.md, plan.md, constitution.md"), extract to `.claude/skills/load-feature-context.md` for reuse.

### Extraction Decision Workflow

For each section with >3 steps:

1. **Does it have branching logic?** (if/then, conditionals, user prompts)
   - **Yes + multi-step**: Extract to **agent**
   - **No**: Keep inline (simple sequential procedure)
2. **Is this pattern used in multiple commands?**
   - **Yes**: Extract to **skill** instead of agent
   - **No**: Proceed with agent extraction or keep inline
3. **Is it tightly coupled to this specific command?** (references command-specific variables, unique to this workflow)
   - **Yes**: Keep inline even if complex
   - **No**: Proceed with extraction

### What to Extract

When extracting a section to an agent or skill:

- **Extract**: The procedural steps, conditional logic, user prompts, file operations
- **Keep inline in command**: Script invocation (`{SCRIPT}`), handoff instructions, input validation boilerplate

---

## Workflow Section Extraction

**Purpose**: Once you've identified sections to extract (via the analysis above), create the actual agent or skill files and populate them with appropriate content.

### Agent File Creation

When extracting a multi-step workflow to an agent:

1. **Determine agent name**: Based on purpose with `speck.` prefix per FR-007a (e.g., `speck.plan-workflow.md`, `speck.validate-spec.md`, `speck.generate-contracts.md`)
2. **Create file**: `.claude/agents/speck.<name>.md`
3. **Write agent content** (NO YAML frontmatter for agents, just markdown):

```markdown
# Agent: <Purpose>

**Purpose**: <One-sentence description of what this agent does>

**Invoked by**: <Which command calls this agent>

**Input**: <What context/data the agent receives>

**Output**: <What the agent produces>

---

## Instructions

<Copy the extracted workflow steps here, adapting from command body to agent instructions>

<Include conditional logic, branching points, user prompts>

<Preserve the workflow intent while making it agent-appropriate>

---

## Example

<Optional: Include an example of the agent in action>
```

**Example Agent Creation**:

If extracting the constitution checking workflow from `/speckit.plan`:

**Input** (from command body):
```markdown
3. Check constitution compliance:
   - If violations found, ask user to resolve
   - If user says "skip", continue with warnings
   - If user says "abort", exit with error code 1
```

**Output** (`.claude/agents/speck.check-constitution.md`):
```markdown
# Agent: Check Constitution Compliance

**Purpose**: Validate feature specification against project constitution principles

**Invoked by**: `/speck.plan` command

**Input**: Feature specification path, constitution path

**Output**: Validation results with violations list or approval confirmation

---

## Instructions

1. Read the feature specification from the provided path
2. Read the constitution from `/memory/constitution.md`
3. For each constitutional principle:
   - Check if the specification violates the principle
   - Document specific violations with line numbers and explanations
4. If violations found:
   - Present the list of violations to the user
   - Ask: "Violations detected. Do you want to: (1) Resolve now, (2) Skip with warnings, (3) Abort?"
   - If user chooses "Resolve now": Guide them through fixing each violation
   - If user chooses "Skip with warnings": Continue with documented warnings
   - If user chooses "Abort": Exit with error message and exit code 1
5. If no violations: Report success and continue

---

## Example

Given a spec that lacks measurable success criteria (violates Constitution Principle IV):

**Violation**: "Success Criteria section has only qualitative statements, no quantitative metrics"
**User Prompt**: "Violation detected. Options: (1) Add measurable criteria now, (2) Skip, (3) Abort"
**User Response**: "1"
**Agent Action**: "Great! Let's add measurable success criteria. What metrics define success for this feature?"
```

### Skill File Creation

When extracting a reusable capability to a skill:

1. **Determine skill name**: Based on capability with `speck.` prefix per FR-007a (e.g., `speck.load-feature-context`, `speck.validate-json-schema`, `speck.generate-test-fixtures`)
2. **Create file**: `.claude/skills/speck.<name>.md`
3. **Write skill content** with YAML frontmatter:

```markdown
---
description: <Brief description of what this skill does>
---

# Skill: <Capability Name>

**Purpose**: <What this skill does>

**Used by**: <List of commands that use this skill>

**Input Parameters**: <What parameters this skill accepts>

**Output**: <What this skill returns>

---

## Usage

<How to invoke this skill from a command or agent>

Example:
```
Skill(skill: "skill-name", param1: "value1", param2: "value2")
```

---

## Implementation

<The actual skill logic - extracted common pattern>

---

## Example

<Example invocation and result>
```

**Example Skill Creation**:

If multiple commands need to load feature context:

**Output** (`.claude/skills/speck.load-feature-context.md`):
```markdown
---
description: Load feature specification, implementation plan, and constitution for analysis
---

# Skill: Load Feature Context

**Purpose**: Load feature specification, implementation plan, and constitution for analysis

**Used by**: `/speck.plan`, `/speck.tasks`, `/speck.analyze`, `/speck.implement`

**Input Parameters**:
- `feature_dir`: Path to feature directory (e.g., `specs/001-feature-name/`)
- `include_plan`: Boolean, whether to load plan.md (optional, default false)

**Output**: Object containing:
- `spec`: Contents of spec.md
- `plan`: Contents of plan.md (if requested)
- `constitution`: Contents of constitution.md

---

## Usage

Invoke with:
```
Skill(skill: "load-feature-context", feature_dir: "/path/to/feature", include_plan: true)
```

---

## Implementation

1. Read `spec.md` from feature_dir
2. If include_plan is true, read `plan.md` from feature_dir
3. Read `/memory/constitution.md`
4. Return object with loaded content
5. Handle missing files gracefully with clear error messages

---

## Example

**Input**: `feature_dir: "specs/001-speck-core/", include_plan: true`
**Output**:
```json
{
  "spec": "# Feature Specification: Upstream Sync...",
  "plan": "# Implementation Plan: Upstream Sync...",
  "constitution": "# Project Constitution\n\n## Principle I..."
}
```
```

### Extraction Completeness

**CRITICAL**: Ensure you extract ALL workflow sections that meet FR-007 criteria:

- **Don't miss eligible sections**: If a section has >3 steps + branching, it MUST be extracted
- **Document extraction decisions**: For each section, note why it was extracted or kept inline
- **Verify coverage**: After transformation, check that all complex workflows are factored appropriately

---

## Command Body Updater

**Purpose**: After extracting workflow sections into agents/skills, update the original command body to invoke them using Task or Skill tools instead of containing the logic inline.

### Update Strategy

For each extracted section:

1. **Identify the section location** in the original command body (e.g., "## Outline", steps 2-8)
2. **Replace extracted content** with an invocation of the new agent/skill
3. **Preserve non-extracted content** (script calls, handoffs, input validation)
4. **Maintain command flow** (ensure command still reads logically)

### Invocation Syntax

**For Agents** (use Task tool):

```markdown
**Use the Task tool** to invoke the [agent-name] agent with the following context:
- Context variable 1: value
- Context variable 2: value

Example invocation:
```
Task(
  subagent_type: "general-purpose",
  description: "Brief description of task",
  prompt: "Execute the workflow defined in .claude/agents/[agent-name].md with the following inputs: ..."
)
```
```

**For Skills** (use Skill tool):

```markdown
**Use the Skill tool** to [skill-purpose]:

```
Skill(skill: "skill-name", param1: "value1", param2: "value2")
```
```

### Example Command Body Update

**Before** (original `/speckit.plan.md` command body):

```markdown
## Outline

1. Run `{SCRIPT}` from repo root and parse JSON for FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH.

2. Load feature spec from FEATURE_SPEC path.

3. Check constitution compliance:
   - If violations found, ask user to resolve
   - If user says "skip", continue with warnings
   - If user says "abort", exit with error code 1

4. Generate research.md with technical decisions.

5. Generate data-model.md with entity definitions.

6. If data model has entities:
   - Generate contracts/ directory with TypeScript interfaces
   - Generate test utilities for mocking

7. Generate quickstart.md with setup instructions.

8. Save all artifacts to SPECS_DIR.

9. Present handoff to `/speck.tasks` for next phase.
```

**After** (updated `/speck.plan.md` command body with agent extraction):

```markdown
## Outline

1. Run `{SCRIPT}` from repo root and parse JSON for FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH.

2. **Execute planning workflow** using the Task tool to invoke the plan-workflow agent:

   **Use the Task tool** to execute the planning workflow with the following context:
   - Feature spec path: FEATURE_SPEC
   - Output directory: SPECS_DIR
   - Constitution path: `/memory/constitution.md`

   Example invocation:
   ```
   Task(
     subagent_type: "general-purpose",
     description: "Execute plan workflow",
     prompt: "Execute the workflow defined in .claude/agents/plan-workflow.md with these inputs:
             - Feature spec: Read from ${FEATURE_SPEC}
             - Constitution: Read from /memory/constitution.md
             - Output dir: ${SPECS_DIR}

             The agent will:
             - Validate constitution compliance
             - Generate research.md
             - Generate data-model.md
             - Generate contracts/ if entities exist
             - Generate quickstart.md
             - Save all artifacts to output directory"
   )
   ```

3. Present handoff to `/speck.tasks` for next phase.
```

**What Changed**:
- Steps 2-8 (the multi-step workflow) extracted to `.claude/agents/plan-workflow.md`
- Original steps 2-8 replaced with Task tool invocation (new step 2)
- Step 1 (script execution) and step 9 (handoff) kept inline
- Command still flows logically: setup → execute workflow → handoff

### Update Rules

**Keep Inline** (don't replace):
- `{SCRIPT}` placeholders - these reference the Bun TypeScript scripts
- `{AGENT_SCRIPT}` placeholders - these are for agent context management
- User input sections (`$ARGUMENTS`)
- Simple setup steps (1-2 steps, no branching)
- Handoff instructions to other commands

**Replace with Agent/Skill Invocation**:
- Multi-step workflows that were extracted (>3 steps + branching)
- Reusable patterns that were factored into skills

### Preservation Requirements

**CRITICAL**: While updating the command body:

1. **Preserve SPECK-EXTENSION blocks** - never modify extension content
2. **Preserve frontmatter** - keep YAML metadata intact (only update script references if needed)
3. **Maintain readability** - command should still be easy to follow
4. **Keep command context** - invocations should pass necessary context to agents/skills
5. **Document changes** - note what was extracted and where it now lives

### Validation

After updating command body:

1. **Check frontmatter** - YAML is still valid
2. **Check invocations** - Task/Skill tool calls are syntactically correct
3. **Check flow** - Command logic still makes sense end-to-end
4. **Check extensions** - SPECK-EXTENSION blocks are untouched
5. **Check completeness** - All extracted sections have been replaced with invocations

---

## Workflow

**CRITICAL**: Check for existing Speck command files first to preserve
SPECK-EXTENSION blocks and minimize changes.

1. **Check for existing file**: Determine target path
   `.claude/commands/speck.[NAME].md`
2. **Read existing Speck command if present**:
   - Extract all `[SPECK-EXTENSION:START]` ... `[SPECK-EXTENSION:END]` blocks
   - Note existing structure, formatting, and customizations
   - Identify what actually needs to change vs. what can stay the same
3. **Parse frontmatter** from upstream source command
4. **Transform script references** (bash → Bun TS)
5. **Transform agent references** (speckit → speck)
6. **Update command body paths** (scripts/bash → .speck/scripts)
7. **Preserve extension markers**:
   - First, copy any extension blocks from the **existing Speck command** (if it
     exists)
   - Second, adapt any extension blocks from the **upstream source command**
   - If both exist and conflict, preserve Speck version and note the conflict
8. **Minimize changes**: If existing command has same functionality, only
   update:
   - Parts affected by upstream changes
   - Script path references if they changed
   - Keep existing workflow steps, variable names, and patterns where possible
9. **Write to** `.claude/commands/speck.[NAME].md`

---

## Extension Marker Handling

**CRITICAL**: SPECK-EXTENSION blocks take priority over upstream changes.

### Priority Order (Highest to Lowest)

1. **Existing Speck command extensions** (`.claude/commands/speck.[NAME].md`)
   - These are Speck-specific customizations and MUST be preserved
   - Copy verbatim into new transformation
2. **Upstream source extensions** (if no existing Speck command exists)
   - Adapt syntax from upstream if this is first transformation
3. **Never merge or modify extension content** - preserve exactly as-is

### Conflict Resolution

If upstream changes overlap with extension blocks:

1. **Preserve Speck extension** - always keep existing Speck version
2. **Check for semantic conflicts** - does upstream change break extension
   logic?
3. **Report conflict** with line numbers and resolution options if semantic
   conflict detected

---

## Output Example

````yaml
---
description: Execute the implementation planning workflow
scripts:
  sh: .speck/scripts/setup-plan.ts --json
agent_scripts:
  sh: .speck/scripts/update-agent-context.ts __AGENT__
handoffs:
  - label: Create Tasks
    agent: speck.tasks
    prompt: Break the plan into tasks
    send: true
---

## User Input

```text
$ARGUMENTS
````

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Setup**: Run `{SCRIPT}` from repo root and parse JSON for FEATURE_SPEC,
   IMPL_PLAN, SPECS_DIR, BRANCH.

2. **Load context**: Read FEATURE_SPEC and `/memory/constitution.md`.

[Rest of command body with preserved workflow...]

````
---

## Error Handling

### Conflict Detection

If upstream changes overlap with `[SPECK-EXTENSION]` blocks:

```markdown
## ⚠️ CONFLICT DETECTED

**File**: `plan.md`
**Extension Block**: Lines 35-42
**Upstream Change**: Lines 38-40 modified

**Options**:
1. Skip this file (keep existing Speck version)
2. Manual merge required
3. Abort transformation
````

### Missing Scripts

If command references a script not generated by bash-to-Bun agent:

```markdown
## ⚠️ INCOMPLETE TRANSFORMATION

**Command**: `speck.custom.md` **Missing Script**: `.speck/scripts/custom.ts`
**Source**: `scripts/bash/custom.sh` (not found)

**Action**: Manual implementation required or exclude command
```

---

## Transformation Report Format

```markdown
## speck.plan.md

**Source**: `upstream/v1.0.0/templates/commands/plan.md` **Output**:
`.claude/commands/speck.plan.md` **Existing File**: Yes (updated) / No (created
new)

**Transformations**:

- Script: `scripts/bash/setup-plan.sh` → `.speck/scripts/setup-plan.ts`
- Agent: `speckit.tasks` → `speck.tasks`
- Extensions: 1 block preserved from existing Speck command (lines 45-52)

**Changes Made** (if existing file):

- Updated script path in frontmatter (setup-plan.sh → setup-plan.ts)
- Updated handoff agent reference (speckit.tasks → speck.tasks)
- Preserved existing workflow steps (no changes needed)
- Preserved SPECK-EXTENSION block verbatim

**Status**: ✅ Complete (minimal changes - only script references updated)
```

---

## Validation Checklist

For each transformed command:

- [ ] Frontmatter YAML valid
- [ ] All bash script refs → `.speck/scripts/*.ts`
- [ ] All `speckit.*` refs → `speck.*`
- [ ] PowerShell refs removed
- [ ] Workflow steps preserved
- [ ] Extension markers intact
- [ ] File saved as `.claude/commands/speck.[NAME].md`
