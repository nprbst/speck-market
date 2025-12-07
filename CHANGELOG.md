# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [speck-reviewer v1.1.3] - 2025-12-07

### Added

- **speck-reviewer**: add skill file read permission to init

### Changed

- **init**: replace bash script with LLM-friendly .gitignore instructions

## [speck-reviewer v1.1.2] - 2025-12-07

### Added

- **speck-reviewer**: add auto-allow permissions and .gitignore management

## [speck-reviewer v1.1.1] - 2025-12-07

### Fixed

- **scripts**: prevent version script from hanging after prompt

## [speck-reviewer v1.1.0] - 2025-12-07

### Added

- **speck-reviewer**: add global CLI with bootstrap and init command
- **version**: add marketplace target and improve changelog format

### Fixed

- **speck-reviewer**: resolve repo name for GitHub API calls
- **speck-reviewer**: sync CLI version with plugin and improve version script

## [marketplace v1.1.1] - 2025-12-07

### Added

- **version**: add marketplace target and improve changelog format
- **version**: auto-generate CHANGELOG.md entries from conventional commits
- **build**: add speck-reviewer plugin to marketplace build

## [marketplace v1.1.1] - 2025-12-07

### Added

- **version**: add marketplace target and improve changelog format
- **version**: auto-generate CHANGELOG.md entries from conventional commits
- **build**: add speck-reviewer plugin to marketplace build
- complete POC parity restoration and website documentation
- implement speck-reviewer plugin with full CLI
- add speck-reviewer plugin specification
- **website**: organic theme with tri-mode toggle and mobile nav improvements (#14)
- Consulting beta deploy with expert-help page and inquiry system (#13)
- **website**: add refresh-website command and document Spec 016
- Atomic Transform Rollback (#12)
- **version**: add --allow-dirty flag to proceed with uncommitted changes
- Scope Simplification - Remove stacked PRs, consolidate CLI, add worktree handoff (#11)

### Changed

- move review state from .claude/ to .speck/
- **cli**: normalize command interface with registry pattern

### Fixed

- **website**: add scroll-margin-top to headings for sticky header
- **website**: improve sidebar scrollbar and TOC overflow
- **website**: improve navigation and sidebar UX
- **worktree**: preserve settings.json and copy settings.local.json during handoff
- **cli**: use plugin-style command syntax (/speck:*) in user-facing messages
- **cli**: expose next-feature command in canonical CLI
- remove misleading warning about local specs/ in multi-repo mode
- add VSCode extension hook fallback instructions to all slash commands
- resolve 10 test failures in IDE launch and path resolution

## [speck v1.10.2] - 2025-12-07

### Added

- **version**: auto-generate CHANGELOG.md entries from conventional commits

## [speck v1.10.1] - 2025-12-07

### Added

- **build**: add speck-reviewer plugin to marketplace build

## [speck v1.10.0] - 2025-12-07

### Added

- complete POC parity restoration and website documentation
- implement speck-reviewer plugin with full CLI
- add speck-reviewer plugin specification
- **website**: organic theme with tri-mode toggle and mobile nav improvements
  (#14)
- Consulting beta deploy with expert-help page and inquiry system (#13)

### Changed

- move review state from .claude/ to .speck/

### Fixed

- **website**: add scroll-margin-top to headings for sticky header
- **website**: improve sidebar scrollbar and TOC overflow
- **website**: improve navigation and sidebar UX

## [speck-reviewer v1.0.2] - 2025-12-07

### Added

- **version**: auto-generate CHANGELOG.md entries from conventional commits

## [speck-reviewer v1.0.1] - 2025-12-07

### Added

- **build**: add speck-reviewer plugin to marketplace build
- complete POC parity restoration and website documentation
- implement speck-reviewer plugin with full CLI
- add speck-reviewer plugin specification
- **website**: organic theme with tri-mode toggle and mobile nav improvements
  (#14)
- Consulting beta deploy with expert-help page and inquiry system (#13)
- **website**: add refresh-website command and document Spec 016
- Atomic Transform Rollback (#12)
- **version**: add --allow-dirty flag to proceed with uncommitted changes
- Scope Simplification - Remove stacked PRs, consolidate CLI, add worktree
  handoff (#11)

### Changed

- move review state from .claude/ to .speck/
- **cli**: normalize command interface with registry pattern
- remove FILE_CONTENTS from slash command instructions

### Fixed

- **website**: add scroll-margin-top to headings for sticky header
- **website**: improve sidebar scrollbar and TOC overflow
- **website**: improve navigation and sidebar UX
- **worktree**: preserve settings.json and copy settings.local.json during
  handoff
- **cli**: use plugin-style command syntax (/speck:*) in user-facing messages
- **cli**: expose next-feature command in canonical CLI
- remove misleading warning about local specs/ in multi-repo mode
- add VSCode extension hook fallback instructions to all slash commands
- resolve 10 test failures in IDE launch and path resolution
- make all AVAILABLE_DOCS paths relative to child REPO_ROOT

## [speck v1.9.5] - 2025-11-30

### Added

- **website**: add refresh-website command and document Spec 016

### Fixed

- **worktree**: preserve settings.json and copy settings.local.json during
  handoff

## [speck v1.9.4] - 2025-11-30

### Added

- Atomic Transform Rollback (#12)

### Changed

- **cli**: normalize command interface with registry pattern

## [speck v1.9.3] - 2025-11-30

### Changed

- Internal improvements and maintenance

## [speck v1.9.2] - 2025-11-30

### Added

- **version**: add --allow-dirty flag to proceed with uncommitted changes

### Fixed

- **cli**: use plugin-style command syntax (/speck:*) in user-facing messages

## [speck v1.9.1] - 2025-11-30

### Fixed

- **cli**: expose next-feature command in canonical CLI

## [speck v1.9.0] - 2025-11-30

### Added

- Scope Simplification - Remove stacked PRs, consolidate CLI, add worktree
  handoff (#11)

## [speck v1.8.39] - 2025-11-30

### Changed

- **commands**: remove virtual command fallback instructions

### Fixed

- **implement**: remove stacked PR logic per 015-scope-simplification

## [speck v1.8.38] - 2025-11-30

### Added

- **cli**: add next-feature command to consolidate git branch checking

## [speck v1.8.37] - 2025-11-30

### Fixed

- **branches**: always write branches.json and forward --branch flag

## [speck v1.8.36] - 2025-11-30

### Fixed

- **prereq**: add TEMPLATES_DIR to paths-only output

## [speck v1.8.35] - 2025-11-30

### Changed

- Internal improvements and maintenance

## [speck v1.8.34] - 2025-11-30

### Added

- **prereq**: add TEMPLATE_DIR to SPECK_PREREQ_CONTEXT for robust template path
  resolution

## [speck v1.8.33] - 2025-11-30

### Fixed

- **paths**: detect .speck/root symlink at CWD for monorepo packages

## [speck v1.8.32] - 2025-11-30

### Added

- **init**: add speck CLI to default allowed permissions

## [speck v1.8.31] - 2025-11-30

### Added

- **cli**: add speck link subcommand for multi-repo/monorepo linking

## [speck v1.8.30] - 2025-11-30

### Added

- **env**: add warning for conflicting spec.md files in multi-repo mode

## [speck v1.8.29] - 2025-11-30

### Changed

- **env**: simplify speck.env.md and fix broken symlink detection

## [speck v1.8.28] - 2025-11-30

### Fixed

- **handoff**: disable SessionStart hook to prevent race condition

## [speck v1.8.27] - 2025-11-30

### Fixed

- **plan**: add explicit quickstart.md generation step

## [speck v1.8.26] - 2025-11-29

### Fixed

- **multi-repo**: create local specs dir and fix prereq context injection

## [speck v1.8.25] - 2025-11-29

### Fixed

- **multi-repo**: share contracts at root repo, keep other artifacts local

## [speck v1.8.24] - 2025-11-29

### Fixed

- **paths**: detect multi-repo mode from worktree's main repository

## [speck v1.8.23] - 2025-11-29

### Fixed

- **create-new-feature**: respect --shared-spec in worktree mode
- **cli**: pass --no-ide flag correctly to create-new-feature

## [speck v1.8.22] - 2025-11-29

### Added

- **worktree**: embed file rules in config for visibility

## [speck v1.8.21] - 2025-11-29

### Added

- **env**: display current git branch in speck env output

### Changed

- **cli**: simplify update-agent-context to Claude-only

## [speck v1.8.20] - 2025-11-29

### Added

- **cli**: add update-agent-context command to speck CLI

## [speck v1.8.19] - 2025-11-29

### Fixed

- **paths**: handle bundled CLI path resolution for templates

## [speck v1.8.18] - 2025-11-29

### Added

- **cli**: add setup-plan command to speck CLI

## [speck v1.8.17] - 2025-11-29

### Fixed

- **handoff**: use direct claude path in VSCode tasks

## [speck v1.8.16] - 2025-11-29

### Added

- **cli**: add launch-ide command and include worktree/ in bundle

### Fixed

- **worktree**: add --no-ide flag and fix VSCode tasks shell config

## [speck v1.8.15] - 2025-11-29

### Fixed

- **init**: simplify speck init command to try direct call first

## [speck v1.8.14] - 2025-11-29

### Fixed

- **worktree**: defer IDE launch until after spec is fully written

## [speck v1.8.13] - 2025-11-29

### Fixed

- **config**: change default worktreePath to ../ for peer directory worktrees

## [speck v1.8.12] - 2025-11-29

### Added

- **init**: add CLI flags for config options and update slash command

## [speck v1.8.11] - 2025-11-29

### Added

- **init**: create config.json with interactive prompts and worktree enabled by
  default

## [speck v1.8.10] - 2025-11-29

### Fixed

- **worktree**: write spec.md to feature worktree instead of main repo

## [speck v1.8.9] - 2025-11-29

### Fixed

- **commands**: use Commander.js CLI pattern for create-new-feature and
  update-agent-context

## [speck v1.8.8] - 2025-11-29

### Added

- **init**: auto-configure plugin template permissions on init

### Fixed

- **commands**: use Commander.js CLI pattern for check-prerequisites

## [speck v1.8.7] - 2025-11-29

### Fixed

- **prereq**: require git repository for all Speck operations

## [speck v1.8.6] - 2025-11-29

### Fixed

- **init**: make /speck:init idempotent by checking PATH first
- **bootstrap**: simplify entrypoint path for plugin-only use

## [speck v1.8.5] - 2025-11-29

### Changed

- Internal improvements and maintenance

## [speck v1.8.4] - 2025-11-29

### Changed

- Internal improvements and maintenance

## [speck v1.8.3] - 2025-11-29

### Added

- **cli**: bundle CLI to dist and add init to registry

### Fixed

- **build**: rebuild hook bundles before plugin packaging

## [speck v1.8.2] - 2025-11-29

### Added

- **init**: create .speck/ directory and suggest constitution setup

## [speck v1.8.1] - 2025-11-29

### Added

- **init**: create .speck/ directory and suggest constitution setup

## [speck v1.8.0] - 2025-11-29

### Added

- add session handoff and bun bootstrap implementation details
- add scope simplification spec, plan, and tasks

### Changed

- remove branch-command tests and restore non-branch tests
- simplify bootstrap to symlink directly to index.ts

## [speck v1.7.17] - 2025-11-24

### Changed

- Internal improvements and maintenance

## [speck v1.7.16] - 2025-11-23

### Fixed

- remove misleading warning about local specs/ in multi-repo mode

## [speck v1.7.15] - 2025-11-23

### Fixed

- add VSCode extension hook fallback instructions to all slash commands
- resolve 10 test failures in IDE launch and path resolution

## [speck v1.7.14] - 2025-11-23

### Changed

- remove FILE_CONTENTS from slash command instructions

## [speck v1.7.13] - 2025-11-23

### Fixed

- make all AVAILABLE_DOCS paths relative to child REPO_ROOT

## [speck v1.7.12] - 2025-11-23

### Added

- convert AVAILABLE_DOCS to relative paths and add constitutions

## [speck v1.7.11] - 2025-11-23

### Changed

- simplify AVAILABLE_DOCS to recursively collect all files

## [speck v1.7.10] - 2025-11-23

### Added

- return absolute paths in AVAILABLE_DOCS for multi-repo clarity

## [speck v1.7.9] - 2025-11-23

### Changed

- Internal improvements and maintenance

## [speck v1.7.8] - 2025-11-23

### Fixed

- multi-repo planning commands now write to child repo

## [speck v1.7.7] - 2025-11-23

### Changed

- Internal improvements and maintenance

## [speck v1.7.6] - 2025-11-23

### Changed

- Internal improvements and maintenance

## [speck v1.7.5] - 2025-11-23

### Changed

- Internal improvements and maintenance

## [speck v1.7.4] - 2025-11-23

### Changed

- Internal improvements and maintenance

## [speck v1.7.3] - 2025-11-22

### Fixed

- enhance speck-knowledge skill description for better auto-activation

## [speck v1.7.2] - 2025-11-22

### Fixed

- optimize speck-knowledge skill description for auto-activation

## [speck v1.7.1] - 2025-11-22

### Added

- backfill speck-knowledge skill with features 007-012

### Changed

- implement progressive disclosure for speck-knowledge skill

## [speck v1.7.0] - 2025-11-22

### Added

- worktree integration - work on multiple features simultaneously (#10)

## [speck v1.6.8] - 2025-11-22

### Fixed

- **templates**: add constitution template and update template references

## [speck v1.6.7] - 2025-11-22

### Fixed

- **hooks**: allow setup commands before specify and improve git detection

## [speck v1.6.6] - 2025-11-22

### Fixed

- **hooks**: use process.cwd() instead of import.meta.dir for repo root fallback

## [speck v1.6.5] - 2025-11-22

### Fixed

- bundle all hooks and update plugin manifests

## [speck v1.6.4] - 2025-11-22

### Changed

- Internal improvements and maintenance

## [speck v1.6.3] - 2025-11-22

### Changed

- Internal improvements and maintenance

## [speck v1.6.2] - 2025-11-22

### Changed

- Internal improvements and maintenance

## [speck v1.6.1] - 2025-11-22

### Changed

- Internal improvements and maintenance

## [speck v1.6.0] - 2025-11-22

### Added

- complete Phase 7 architecture docs and Phase 8 validation
- complete P1 content with spec-kit attribution & fair comparison
- integrate speck-kit attribution from clarifications
- complete P1 website content for multi-repo and stacked PRs
- implement website content update for advanced features
- add tasks.md and apply analysis remediation
- add implementation plan and design artifacts for website update
- add website feature update specification
- implement multi-repo support, stacked PRs, and virtual command pattern (specs
  007-010) (#8)

### Fixed

- **website**: fix dead links and balance comparison page
- add --skip-plan-check flag for /speck.plan workflow

## [speck v1.5.4] - 2025-11-17

### Fixed

- use upstream constitution template in plugin package

## [speck v1.5.3] - 2025-11-17

### Fixed

- move templates and memory to plugin root level

## [speck v1.5.2] - 2025-11-17

### Fixed

- update speck.constitution command for new template location

## [speck v1.5.1] - 2025-11-17

### Changed

- move templates and memory to .speck/ directory

## [speck v1.5.0] - 2025-11-17

### Changed

- move templates and memory to .speck/ directory

## [speck v1.4.2] - 2025-11-17

### Changed

- rename speck-workflow skill to speck-knowledge

### Fixed

- add interactive confirmation prompt to remove-worktree script

## [speck v1.4.1] - 2025-11-17

### Added

- add Slash Command Reference and build script pattern replacement (T044, T045)

## [speck v1.4.0] - 2025-11-17

### Added

- implement Speck Workflow Skill (45/47 tasks complete)
- complete planning and task generation for Speck Workflow Skill
  (005-speck-skill)
- add Speck Workflow Skill specification (005-speck-skill)
- add Claude Plugin packaging specification (#2)

## [speck v1.3.7] - 2025-11-16

### Added

- complete plugin packaging implementation

## [speck v1.3.6] - 2025-11-16

### Added

- transform command files for plugin publication

## [speck v1.3.5] - 2025-11-16

### Added

- update all commands to use .speck/plugin-path pattern

### Changed

- simplify plugin structure and setup hook

## [speck v1.3.4] - 2025-11-16

### Added

- use .speck/plugin-path for simpler plugin root detection

## [speck v1.3.3] - 2025-11-16

### Added

- enhance speck.env command with comprehensive diagnostics

### Fixed

- restructure build output to nest plugin under marketplace root

## [speck v1.3.2] - 2025-11-16

### Added

- add persistent log file for SessionStart hook diagnostics

## [speck v1.3.1] - 2025-11-16

### Fixed

- correct hooks.json format and add CLAUDE_PLUGIN_ROOT path

## [speck v1.3.0] - 2025-11-16

### Added

- implement SessionStart hooks and plugin context detection
- implement plugin context detection for script execution

## [speck v1.2.0] - 2025-11-16

### Fixed

- resolve plugin path issues for installed plugins

## [speck v1.1.2] - 2025-11-16

### Added

- automate git push in version script

## [speck v1.1.1] - 2025-11-16

### Added

- add plugin publishing automation
- implement Claude Plugin packaging system
- add Claude Plugin packaging specification
- add non-interactive worktree management scripts
- **transform**: transform upstream v0.0.84 and v0.0.85
- **FR-013**: implement transformation history tracking and enforce speck.
  prefix
- **optimization**: add diff-aware transformation for incremental releases
- **transform-agents**: add incremental update support with SPECK-EXTENSION
  priority
- **transform-agent**: add test generation and validation requirements
- **phase-3**: transform upstream v0.0.83 to Bun TypeScript (T070-T090)
- **phase-3**: implement /speck.transform-upstream command (T048-T069)
- **phase-3**: implement /speck.pull-upstream command (T029-T047)
- **phase-3**: implement /speck.check-upstream command (T018-T028)
- **foundational**: complete Phase 2 common utilities tests (T015-T017)
- **tasks**: add implementation task list with 86 tasks organized by phase
- **plan**: add implementation plan with medium-weight test strategy
- **spec**: clarify upstream sync architecture with three-command pipeline
- re-plan Speck implementation with corrected Bun CLI intent
- implement foundational infrastructure and refine specifications
- complete implementation plan for Speck core project
- add Speck core project specification and amend constitution to v1.1.0

### Changed

- **worktree**: simplify file copy/symlink configuration
- **architecture**: move orchestration from script to slash command
- **spec**: reduce scope to ONLY upstream sync and transformation
- **spec**: reorder priorities to focus on upstream sync pipeline

### Fixed

- improve version script workflow automation
- filter plugin package for marketplace distribution
- **worktree**: update repo root validation and script paths
- **transform**: fix diff detection and agent comparison logic
- **upstream-sync**: download release artifacts instead of repository tarball
