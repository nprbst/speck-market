---
description: Load speck-help skill for answering questions about Speck features, specs, plans, and tasks
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Speck Help Skill

This command activates the **speck-help** skill to answer natural language questions about Speck workflow artifacts.

### What This Skill Does

The speck-help skill interprets Speck specification artifacts and answers questions without requiring you to manually read files:

- **spec.md**: Requirements, user stories, success criteria
- **plan.md**: Implementation approach, technical context, constitution check
- **tasks.md**: Task breakdown, dependencies, progress

### Skill Location

Load the skill from: `.claude/skills/speck-help/`

The skill includes these reference files:
- `SKILL.md` - Core capabilities and activation patterns
- `reference.md` - Detailed interpretation rules and error formats
- `examples.md` - Usage examples
- `workflows.md` - Multi-repo, worktrees, and session handoff

### Example Questions

You can ask questions like:

- "What are the functional requirements for feature 015?"
- "How many tasks are completed for this feature?"
- "Does my spec follow the template?"
- "What should go in the Success Criteria section?"
- "Is this a multi-repo setup?"
- "Did my session handoff work?"
- "What's the worktree config?"

### How to Use

After loading this skill, simply ask your question about Speck artifacts. The skill will:

1. Identify the feature from your query (by number, name, or current context)
2. Load the relevant artifact files (spec.md, plan.md, tasks.md)
3. Parse and interpret the content
4. Answer your question with specific information

### Related Commands

For **modifying** Speck artifacts, use these commands instead:

| Command | Purpose |
|---------|---------|
| `/speck:specify` | Create or update feature specification |
| `/speck:clarify` | Resolve ambiguities in specs |
| `/speck:plan` | Generate implementation plan |
| `/speck:tasks` | Generate task breakdown |
| `/speck:implement` | Execute implementation tasks |
| `/speck:analyze` | Check cross-artifact consistency |

## Context

$ARGUMENTS
