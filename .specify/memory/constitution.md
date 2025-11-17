<!--
SYNC IMPACT REPORT
==================
Version Change: 1.1.0 → 1.1.1
Modified Principles: V (Claude Code Native) - added plugin bundling exception
Added Sections: None
Removed Sections: None

Templates Requiring Updates:
  ⚠ .specify/templates/plan-template.md - pending review for constitution alignment
  ⚠ .specify/templates/spec-template.md - pending review for constitution alignment
  ⚠ .specify/templates/tasks-template.md - pending review for constitution alignment
  ⚠ .claude/commands/speckit.*.md - pending review for principle references

Follow-up TODOs: None

Rationale for 1.1.1 (PATCH bump):
  - Clarification to Principle V allowing plugin bundling skills
  - Does not change core principle, only clarifies application scope
  - No breaking changes to governance
-->

# Speck Constitution

## Core Principles

### I. Upstream Fidelity

Speck MUST maintain compatibility with GitHub's spec-kit methodology while
adding Claude Code-specific enhancements. All features and workflows MUST
preserve the ability to sync with upstream spec-kit releases.

**Rationale**: Speck is a living derivative, not a fork. Users benefit from
spec-kit community improvements while gaining Claude Code optimizations.
Breaking from upstream methodology fragments the ecosystem and loses long-term
maintainability.

**Implementation Requirements**:

- Track upstream spec-kit version in `.speck/upstream-tracker.json`
- Mark all Speck-specific code with `[SPECK-EXTENSION:START/END]` boundaries
- Provide `/speck.transform-upstream` command for semantic synchronization
- Generate sync reports documenting changes, preserved extensions, and conflicts

### II. Extension Preservation (NON-NEGOTIABLE)

All Speck-specific enhancements MUST be preserved during upstream
synchronization. Extension markers MUST be respected 100% during transformation
operations.

**Rationale**: Speck's value proposition is Claude Code optimization. Losing
enhancements during sync defeats the purpose of the derivative architecture.

**Implementation Requirements**:

- MANDATORY extension markers: `[SPECK-EXTENSION:START]` and
  `[SPECK-EXTENSION:END]`
- Transformation tools MUST never modify content within extension boundaries
- Conflicts between upstream changes and extensions MUST halt sync and request
  human resolution
- Extension manifest (`extension-markers.json`) MUST be kept current

### III. Specification-First Development

All features MUST begin with a technology-agnostic specification before
implementation. Specifications MUST NOT contain implementation details
(languages, frameworks, databases, APIs).

**Rationale**: Implementation-agnostic specs enable better design thinking,
clearer communication with stakeholders, and flexibility in technology choices.
Premature implementation decisions constrain problem-solving.

**Implementation Requirements**:

- Mandatory spec sections: User Scenarios & Testing, Requirements, Success
  Criteria
- Quality validation MUST reject specs containing implementation details
- Success criteria MUST be measurable and technology-agnostic
- Functional requirements MUST be testable and unambiguous
- Maximum 3 `[NEEDS CLARIFICATION]` markers per spec, prioritized by impact

### IV. Quality Gates

Specifications, plans, and tasks MUST pass automated quality validation before
proceeding to the next phase. Validation failures MUST block progression.

**Rationale**: Early quality enforcement prevents downstream rework. Automated
gates ensure consistency and completeness without manual oversight burden.

**Implementation Requirements**:

- Specification quality checklist at `<feature-dir>/checklists/requirements.md`
- Automated validation for: no implementation details, testable requirements,
  measurable success criteria, mandatory sections completion
- 95% first-pass validation success rate target (SC-003)
- Quality checklist MUST be updated with each validation iteration

### V. Claude Code Native

All workflows MUST be optimized for Claude Code as the primary development
environment. Slash commands, agents, skills and plugins are first-class
citizens.

**Rationale**: Speck exists to make spec-kit workflows seamless in Claude Code.
While CLI tools provide flexibility, Claude Code integration is the core value
proposition.

**Implementation Requirements**:

- Slash commands (`/speck.*`) MUST integrate with Claude Code's command
  interface
- Agents MUST be used for long-running, iterative processes (clarification,
  transformation)
- Skills MUST extract reusable patterns (template rendering, validation)
- Exception: Skills MAY serve as execution delegates in plugin contexts where direct script execution is unavailable (e.g., speck-runner skill bundles scripts for Claude Plugin distribution)
- TypeScript CLI MUST provide identical functionality for non-Claude Code users
  (parity requirement: <1% behavioral deviation per SC-005)

### VI. Technology Agnosticism

Core methodology and templates MUST remain technology-agnostic. Runtime
implementations (TypeScript CLI) MUST NOT leak into specification or planning
artifacts.

**Rationale**: Specifications describe WHAT users need, not HOW to implement.
Technology-agnostic specs enable flexibility, better communication, and
longer-term relevance as technologies evolve.

**Implementation Requirements**:

- Zero tolerance for framework/language mentions in specs (SC-002)
- Success criteria MUST focus on user outcomes, not system internals
- Template validation MUST flag technical jargon
- Out of Scope sections MUST explicitly exclude technical implementations not
  part of feature requirements

### VII. File Format Compatibility (NON-NEGOTIABLE)

Speck MUST maintain 100% compatibility with spec-kit's on-disk file format and
directory structure conventions in the `specs/` tree. Projects MUST be able to
adopt Speck without migration, and fallback to spec-kit without data loss.

**Rationale**: Drop-in compatibility eliminates adoption friction and migration
risk. Users can evaluate Speck alongside spec-kit, switch between them freely,
or use both tools on the same project. Breaking file format compatibility would
force migration, create lock-in, and violate the derivative architecture
principle.

**Implementation Requirements**:

- `specs/` directory structure MUST match spec-kit exactly:
  `specs/<number>-<short-name>/`
- Artifact file names MUST match spec-kit conventions: `spec.md`, `plan.md`,
  `tasks.md`, `checklists/*.md`
- Markdown file format and section headers MUST be compatible with spec-kit
  templates
- Feature numbering scheme MUST be identical (3-digit zero-padded numbers)
- Branch naming convention MUST match: `<number>-<short-name>`
- Speck-specific metadata MUST be stored outside `specs/` (e.g., `.speck/`)
- Generated artifacts MUST be readable and editable by spec-kit users without
  loss of core content
- Validation: A project using Speck MUST function correctly if Speck is removed
  and spec-kit is used instead

## Upstream Sync Requirements

### Release-Based Synchronization

Speck MUST sync with upstream spec-kit via GitHub Releases, not git subtree or
direct repository cloning.

**Rationale**: Release-based sync provides versioned, immutable snapshots for
clean diffing. Avoids git history overhead and ensures stable reference points.

**Implementation Requirements**:

- Track releases in `upstream/.release-info.json`
- Maintain at least previous release for tree diffing
- Use symlink `upstream/spec-kit/current` pointing to active version
- Commands: `/speck.check-upstream-releases`, `/speck.download-upstream`,
  `/speck.diff-upstream-releases`

### Semantic Transformation

Upstream changes MUST be transformed semantically, not mechanically. Claude
agent-powered transformation MUST understand intent, not just syntax.

**Rationale**: Bash-to-Claude Code translation requires reasoning about design
patterns, not string replacement. Mechanical transformation breaks on edge cases
and misses semantic context.

**Implementation Requirements**:

- Use Claude Code agent via `/speck.transform-upstream` command
- Agent MUST analyze semantic impact before applying changes
- Generate transformation reports with confidence levels
- Request human review for low-confidence or conflicting transformations

## Development Workflow

### Feature Isolation

Multiple parallel features MUST be supported without cross-contamination.
Worktree mode MUST provide true isolation for team environments.

**Implementation Requirements**:

- Git worktree support for isolated development (FR-013)
- Feature numbering MUST check branches, worktrees, AND specs directories
  (FR-014)
- Both isolated and shared specs modes supported (FR-017)
- 10+ parallel features without contamination (SC-006)

### Mandatory Workflow Phases

Every feature MUST proceed through: Specify → Clarify (if needed) → Plan → Tasks
→ Implement → Analyze.

**Rationale**: Structured workflow ensures completeness and quality. Skipping
phases leads to ambiguous specs, incomplete plans, and implementation rework.

**Implementation Requirements**:

- Phase progression enforced by quality gates
- Each phase produces artifacts in `specs/<feature-num>-<short-name>/`
- Clarification MUST resolve all `[NEEDS CLARIFICATION]` markers before planning
- Analysis MUST verify cross-artifact consistency (spec ↔ plan ↔ tasks)

### Testability

All requirements and acceptance scenarios MUST be independently testable. User
stories MUST be independently implementable as viable MVPs.

**Rationale**: Testable requirements prevent ambiguity. Independent user stories
enable incremental delivery and prioritization.

**Implementation Requirements**:

- Each user story includes "Independent Test" description
- Acceptance scenarios use Given-When-Then format
- Edge cases explicitly documented
- Success criteria MUST be verifiable without implementation knowledge

## Governance

This constitution supersedes all other project practices and conventions.
Amendments require documented rationale, approval process, and migration plan
for existing artifacts.

**Amendment Process**:

1. Propose change via `/speckit.constitution` with rationale
2. Version bump (MAJOR: breaking governance changes, MINOR: new
   principles/sections, PATCH: clarifications/typos)
3. Update sync impact report documenting affected templates and commands
4. Propagate changes to dependent templates (plan, spec, tasks, commands)
5. Commit with message: `docs: amend constitution to vX.Y.Z (change summary)`

**Compliance Verification**:

- All specifications MUST pass quality checklist validation
- All plans MUST reference constitutional principles where applicable
- All upstream syncs MUST preserve extension markers
- All slash commands MUST verify they follow Claude Code native principle

**Versioning Policy**:

- Follow semantic versioning: MAJOR.MINOR.PATCH
- MAJOR: Backward-incompatible governance or principle changes
- MINOR: New principles, sections, or material guidance expansions
- PATCH: Clarifications, wording improvements, typo fixes

**Version**: 1.1.1 | **Ratified**: 2025-11-14 | **Last Amended**: 2025-11-16
