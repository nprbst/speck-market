# Speck - Claude Code Plugin

Specification and planning workflow framework for Claude Code.

## About

Speck provides a complete workflow for creating, planning, and implementing features using Claude Code. It includes 9 core slash commands, specialized agents, and templates for generating specifications, implementation plans, and task breakdowns.

## Installation

Install directly from GitHub:

```bash
/plugin install https://github.com/nprbst/speck
```

Or install from a marketplace (if available):

```bash
/plugin install speck
```

## Quick Start

1. **Create a specification**: Start by describing your feature in natural language

   ```bash
   /speck.specify "Add user authentication to the application"
   ```

2. **Generate an implementation plan**: Transform the spec into a technical plan

   ```bash
   /speck.plan
   ```

3. **Create a task breakdown**: Generate actionable tasks

   ```bash
   /speck.tasks
   ```

4. **Execute the implementation**: Follow the tasks to build the feature

   ```bash
   /speck.implement
   ```

## Available Commands

### Core Workflow Commands

- `/speck.specify` - Create or update feature specification from natural language
- `/speck.clarify` - Identify underspecified areas and ask clarification questions
- `/speck.plan` - Execute implementation planning workflow
- `/speck.tasks` - Generate actionable, dependency-ordered task list
- `/speck.implement` - Execute the implementation plan
- `/speck.analyze` - Perform cross-artifact consistency analysis

### Utility Commands

- `/speck.constitution` - Create or update project constitution
- `/speck.checklist` - Generate custom checklist for current feature
- `/speck.taskstoissues` - Convert tasks into GitHub issues

## System Requirements

- **Git**: Version 2.30.0 or higher
- **Shell**: Bash shell access
- **Claude Code**: Version 2.0 or higher
- **Bun**: Version 1.0 or higher (for script execution)

## Example Workflow

```bash
# 1. Start a new feature specification
/speck.specify "Implement REST API for user management with CRUD operations"

# 2. Clarify any ambiguous requirements
/speck.clarify

# 3. Generate implementation plan
/speck.plan

# 4. Break down into tasks
/speck.tasks

# 5. Execute implementation
/speck.implement

# 6. Analyze for consistency
/speck.analyze
```

## Features

- **9 Core Commands**: Essential workflow from specification to implementation
- **2 Specialized Agents**: Transform scripts and commands automatically
- **5 Templates**: Handlebars templates for specs, plans, tasks, constitution, and checklists
- **Runtime Scripts**: Automated workflows for feature management
- **Constitution Support**: Define and enforce project principles

## Documentation

- **Homepage**: https://github.com/nprbst/speck
- **Repository**: https://github.com/nprbst/speck
- **Issues**: https://github.com/nprbst/speck/issues

## License

MIT License - See LICENSE file for details

## Author

Nathan Prabst (nathan@example.com)

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
