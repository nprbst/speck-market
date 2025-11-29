---
description: Execute the implementation plan by processing and executing all tasks defined in tasks.md
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Workflow Mode Detection

Parse command-line flags from user input:
- `--stacked`: Enable stacked PR workflow (prompt for branch creation at user story boundaries)
- `--single-branch`: Explicitly disable stacked PR workflow (suppress all stacking prompts)
- If no flag provided: Read workflow mode from plan.md or constitution (see step 3a)

## Outline

1. Extract prerequisite context from the auto-injected comment in the prompt:
   ```
   <!-- SPECK_PREREQ_CONTEXT
   {"MODE":"single-repo","FEATURE_DIR":"/path/to/specs/010-feature","AVAILABLE_DOCS":["specs/010-feature/research.md","specs/010-feature/tasks.md","specs/010-feature/plan.md",".speck/memory/constitution.md","../../../8-specs/specs/010-feature/checklists/requirements.md"],"WORKFLOW_MODE":"single-branch"}
   -->
   ```
   Use the FEATURE_DIR, AVAILABLE_DOCS, and WORKFLOW_MODE values from this JSON.

   **WORKFLOW_MODE field**: Pre-determined workflow mode (`"stacked-pr"` or `"single-branch"`) from plan.md → constitution.md → default.

   **Fallback**: If the comment is not present (VSCode hook bug), run:
   ```bash
   speck check-prerequisites --json --require-tasks --include-tasks
   ```

   **Fallback (VSCode hook bug)**: If the virtual command fails with exit code 127, run:
   ```bash
   bun ~/.claude/plugins/marketplaces/speck-market/speck/scripts/check-prerequisites.ts --json --require-tasks --include-tasks
   ```
   Then manually parse the JSON output to extract MODE, FEATURE_DIR, AVAILABLE_DOCS, and WORKFLOW_MODE.

2. **Check checklists status** (if checklists exist):
   - Find checklist files from AVAILABLE_DOCS (paths containing "/checklists/")
   - Use Read tool to load each checklist file
   - For each checklist, count:
     - Total items: All lines matching `- [ ]` or `- [X]` or `- [x]`
     - Completed items: Lines matching `- [X]` or `- [x]`
     - Incomplete items: Lines matching `- [ ]`
   - Create a status table:

     ```text
     | Checklist | Total | Completed | Incomplete | Status |
     |-----------|-------|-----------|------------|--------|
     | ux.md     | 12    | 12        | 0          | ✓ PASS |
     | test.md   | 8     | 5         | 3          | ✗ FAIL |
     | security.md | 6   | 6         | 0          | ✓ PASS |
     ```

   - Calculate overall status:
     - **PASS**: All checklists have 0 incomplete items
     - **FAIL**: One or more checklists have incomplete items

   - **If any checklist is incomplete**:
     - Display the table with incomplete item counts
     - **STOP** and ask: "Some checklists are incomplete. Do you want to proceed with implementation anyway? (yes/no)"
     - Wait for user response before continuing
     - If user says "no" or "wait" or "stop", halt execution
     - If user says "yes" or "proceed" or "continue", proceed to step 3

   - **If all checklists are complete**:
     - Display the table showing all checklists passed
     - Automatically proceed to step 3

3. Load and analyze the implementation context:

   Use Read tool to load files from paths in AVAILABLE_DOCS:

   **Required files**:
   - **REQUIRED**: tasks.md
   - **REQUIRED**: plan.md

   **Optional files** (only if they exist in AVAILABLE_DOCS):
   - data-model.md
   - contracts/ files
   - research.md
   - quickstart.md

3a. **Determine Workflow Mode** (for stacked PR automation):
   - Check command-line flags first (highest priority):
     - If `--stacked` in user input → `workflowMode = "stacked-pr"`
     - If `--single-branch` in user input → `workflowMode = "single-branch"`
   - If no flag provided, check WORKFLOW_MODE from prerequisite context (step 1):
     - If WORKFLOW_MODE field is present → use that value
     - If WORKFLOW_MODE field is not present, read from plan.md:
       - Search for line matching: `**Workflow Mode**: stacked-pr` or `**Workflow Mode**: single-branch`
       - If found → use that value
     - If not in plan.md, read from constitution (.speck/memory/constitution.md):
       - Search for line matching: `**Default Workflow Mode**: stacked-pr` or `**Default Workflow Mode**: single-branch`
       - If found → use that value
     - If not found anywhere → default to `"single-branch"`
   - Store the determined workflow mode for use in step 8a

4. **Project Setup Verification**:
   - **REQUIRED**: Create/verify ignore files based on actual project setup:

   **Detection & Creation Logic**:
   - Check if the following command succeeds to determine if the repository is a git repo (create/verify .gitignore if so):

     ```sh
     git rev-parse --git-dir 2>/dev/null
     ```

   - Check if Dockerfile* exists or Docker in plan.md → create/verify .dockerignore
   - Check if .eslintrc* exists → create/verify .eslintignore
   - Check if eslint.config.* exists → ensure the config's `ignores` entries cover required patterns
   - Check if .prettierrc* exists → create/verify .prettierignore
   - Check if .npmrc or package.json exists → create/verify .npmignore (if publishing)
   - Check if terraform files (*.tf) exist → create/verify .terraformignore
   - Check if .helmignore needed (helm charts present) → create/verify .helmignore

   **If ignore file already exists**: Verify it contains essential patterns, append missing critical patterns only
   **If ignore file missing**: Create with full pattern set for detected technology

   **Common Patterns by Technology** (from plan.md tech stack):
   - **Node.js/JavaScript/TypeScript**: `node_modules/`, `dist/`, `build/`, `*.log`, `.env*`
   - **Python**: `__pycache__/`, `*.pyc`, `.venv/`, `venv/`, `dist/`, `*.egg-info/`
   - **Java**: `target/`, `*.class`, `*.jar`, `.gradle/`, `build/`
   - **C#/.NET**: `bin/`, `obj/`, `*.user`, `*.suo`, `packages/`
   - **Go**: `*.exe`, `*.test`, `vendor/`, `*.out`
   - **Ruby**: `.bundle/`, `log/`, `tmp/`, `*.gem`, `vendor/bundle/`
   - **PHP**: `vendor/`, `*.log`, `*.cache`, `*.env`
   - **Rust**: `target/`, `debug/`, `release/`, `*.rs.bk`, `*.rlib`, `*.prof*`, `.idea/`, `*.log`, `.env*`
   - **Kotlin**: `build/`, `out/`, `.gradle/`, `.idea/`, `*.class`, `*.jar`, `*.iml`, `*.log`, `.env*`
   - **C++**: `build/`, `bin/`, `obj/`, `out/`, `*.o`, `*.so`, `*.a`, `*.exe`, `*.dll`, `.idea/`, `*.log`, `.env*`
   - **C**: `build/`, `bin/`, `obj/`, `out/`, `*.o`, `*.a`, `*.so`, `*.exe`, `Makefile`, `config.log`, `.idea/`, `*.log`, `.env*`
   - **Swift**: `.build/`, `DerivedData/`, `*.swiftpm/`, `Packages/`
   - **R**: `.Rproj.user/`, `.Rhistory`, `.RData`, `.Ruserdata`, `*.Rproj`, `packrat/`, `renv/`
   - **Universal**: `.DS_Store`, `Thumbs.db`, `*.tmp`, `*.swp`, `.vscode/`, `.idea/`

   **Tool-Specific Patterns**:
   - **Docker**: `node_modules/`, `.git/`, `Dockerfile*`, `.dockerignore`, `*.log*`, `.env*`, `coverage/`
   - **ESLint**: `node_modules/`, `dist/`, `build/`, `coverage/`, `*.min.js`
   - **Prettier**: `node_modules/`, `dist/`, `build/`, `coverage/`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
   - **Terraform**: `.terraform/`, `*.tfstate*`, `*.tfvars`, `.terraform.lock.hcl`
   - **Kubernetes/k8s**: `*.secret.yaml`, `secrets/`, `.kube/`, `kubeconfig*`, `*.key`, `*.crt`

5. Parse tasks.md structure and extract:
   - **Task phases**: Setup, Tests, Core, Integration, Polish
   - **Task dependencies**: Sequential vs parallel execution rules
   - **Task details**: ID, description, file paths, parallel markers [P]
   - **Execution flow**: Order and dependency requirements

6. Execute implementation following the task plan:
   - **Phase-by-phase execution**: Complete each phase before moving to the next
   - **Respect dependencies**: Run sequential tasks in order, parallel tasks [P] can run together
   - **Follow TDD approach**: Execute test tasks before their corresponding implementation tasks
   - **File-based coordination**: Tasks affecting the same files must run sequentially
   - **Validation checkpoints**: Verify each phase completion before proceeding

7. Implementation execution rules:
   - **Setup first**: Initialize project structure, dependencies, configuration
   - **Tests before code**: If you need to write tests for contracts, entities, and integration scenarios
   - **Core development**: Implement models, services, CLI commands, endpoints
   - **Integration work**: Database connections, middleware, logging, external services
   - **Polish and validation**: Unit tests, performance optimization, documentation

8. Progress tracking and error handling:
   - Report progress after each completed task
   - Halt execution if any non-parallel task fails
   - For parallel tasks [P], continue with successful tasks, report failed ones
   - Provide clear error messages with context for debugging
   - Suggest next steps if implementation cannot proceed
   - **IMPORTANT** For completed tasks, make sure to mark the task off as [X] in the tasks file.

8a. **Stacked PR Automation** (only if workflowMode = "stacked-pr"):
   - **Initialize session state**:
     - `stackingEnabled = true` (can be disabled by user choosing "skip" option)
     - `completedUserStories = []` (track which user stories have been completed)

   - **After completing each user story phase** in tasks.md:
     - Detect user story boundary by checking tasks.md structure (e.g., "## Phase 3: User Story 1")
     - Verify user story is complete by checking:
       - All tasks in that phase are marked [X]
       - All acceptance scenarios from spec.md are met (if testable)

   - **At each detected boundary** (if stackingEnabled = true):
     - Get current git branch: `git rev-parse --abbrev-ref HEAD`
     - Check for uncommitted changes: `git status --porcelain`
     - If uncommitted changes exist:
       - Display warning: "You have uncommitted work. Please commit or stash before creating a stacked branch."
       - Skip stacking prompt for this boundary
       - Continue with implementation

     - If no uncommitted changes:
       - Display completion message: "✓ {User Story ID} complete. All acceptance scenarios passed."
       - **Prompt user**: "Create stacked branch for next work? (yes/no/skip)"
       - **Wait for user response**

       - **If user says "yes"** or "y" or "proceed":
         - Collect metadata interactively:
           - Prompt: "Branch name for next work? (e.g., username/feature-name)"
           - Read branch name from user
           - Validate branch name using `git check-ref-format --branch <name>`
           - If invalid, show error and re-prompt
           - Prompt: "PR title? (leave blank to auto-generate from commits)"
           - Read PR title (optional)
           - Prompt: "PR description? (leave blank to auto-generate from commits)"
           - Read PR description (optional)

         - Use current branch as base for new stacked branch
         - Create PR for current branch:
           - Check if `gh` CLI is available: `which gh` or `gh --version`
           - If `gh` available:
             - Determine PR base from .speck/branches.json (parent's PR base) or default to "main"
             - If PR title/description not provided by user:
               - Get commits on current branch: `git log <pr-base>..<current> --format="%s%n%b"`
               - Analyze commits to generate title/description (first substantive commit subject as title, bulleted list of commits as description)
             - Run: `gh pr create --title "<title>" --body "<description>" --base <pr-base>`
             - Parse PR number from output (look for "https://github.com/.../pull/###")
             - If successful:
               - Update .speck/branches.json with PR number and status="submitted"
               - Display: "✓ Created PR #{number}: {title}"
             - If failed (network error, not authenticated, etc.):
               - Display error message with gh CLI output
               - Suggest: "Install gh CLI or run with --skip-pr-prompt"
               - Continue with branch creation (skip PR step)

           - If `gh` not available:
             - Display: "GitHub CLI (gh) not found. Install it to create PRs automatically."
             - Generate PR URL manually: `https://github.com/{owner}/{repo}/compare/{base}...{current}`
             - Display: "Create PR manually: {URL}"
             - Suggest: "Or install gh CLI: https://cli.github.com/"

         - Create new stacked branch:
           - Run `/speck:branch create <new-branch-name> --base <current-branch> --skip-pr-prompt`
           - If creation fails, display error and halt stacking (do not proceed to next user story)
           - If successful, switch to new branch and continue with next user story

         - Add completed user story to completedUserStories list

       - **If user says "no"** or "n":
         - Display: "Continuing implementation on current branch without creating new branch."
         - Continue with next user story phase on same branch
         - Add completed user story to completedUserStories list

       - **If user says "skip"** or "s":
         - Set `stackingEnabled = false` (suppress all future stacking prompts for this session)
         - Display: "Stacking prompts suppressed for this session. Use /speck:branch create manually if needed."
         - Continue with next user story phase on same branch
         - Add completed user story to completedUserStories list

9. Completion validation:
   - Verify all required tasks are completed
   - Check that implemented features match the original specification
   - Validate that tests pass and coverage meets requirements
   - Confirm the implementation follows the technical plan
   - Report final status with summary of completed work

Note: This command assumes a complete task breakdown exists in tasks.md. If tasks are incomplete or missing, suggest running `/speck:tasks` first to regenerate the task list.
