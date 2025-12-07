# Changelog

All notable changes to Speck will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2025-12-07

### Added

- **version**: auto-generate CHANGELOG.md entries from conventional commits

## [1.10.2] - 2025-12-07

### Added

- **version**: auto-generate CHANGELOG.md entries from conventional commits

## [1.0.0] - 2025-11-15

### Added

- Initial release of Speck as a Claude Code plugin
- 20+ slash commands for complete specification and planning workflow
  - Core workflow: `/speck.specify`, `/speck.plan`, `/speck.tasks`, `/speck.implement`
  - Analysis: `/speck.clarify`, `/speck.analyze`
  - Utilities: `/speck.constitution`, `/speck.checklist`, `/speck.taskstoissues`
  - Upstream management: `/speck.check-upstream`, `/speck.pull-upstream`, `/speck.transform-upstream`
  - Spec-kit compatibility aliases: `/speckit.*` commands
- 2 specialized subagents
  - Bash-to-Bun transformation agent
  - Command transformation agent
- Template system with Handlebars templates
  - Specification template
  - Plan template
  - Tasks template
  - Constitution template
  - Checklist template
- Build and workflow automation scripts
  - Feature prerequisite checking
  - Plan setup and management
  - Agent context updates
- Constitution support for project principles
- Complete plugin packaging with Claude Marketplace compliance
  - plugin.json manifest
  - marketplace.json listing
  - README.md documentation
  - CHANGELOG.md version history

### Dependencies

- Git >= 2.30.0
- Bash shell
- Claude Code >= 2.0
- Bun >= 1.0

[1.0.0]: https://github.com/nprbst/speck/releases/tag/v1.0.0
