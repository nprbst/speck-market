---
description: Link repository to multi-repo speck root
---

# Link Repository to Multi-Repo Speck Root

Creates a `.speck/root` symlink to enable multi-repo mode.

## Usage

```
/speck:link <path-to-speck-root>
```

## Examples

**From frontend repo in my-product/ directory:**
```
/speck:link ..
```

**From nested monorepo package (e.g., packages/ui/):**
```
/speck:link ../..
```

**Using absolute path:**
```
/speck:link /Users/dev/my-product
```

## What This Does

1. Creates symlink: `.speck/root` → `<path>`
2. Enables multi-repo mode (automatic detection)
3. Specs now read/written to `<path>/specs/`
4. Plans/tasks/constitution remain local to this repo

## Multi-Repo Workflow

After linking, you can:

- **Create shared spec**: `/speck:specify "Feature description"` (creates spec at speck root)
- **Generate local plan**: `/speck:plan` (uses this repo's constitution)
- **Check configuration**: `/speck:env` (shows multi-repo status)

## Implementation

```bash
speck-link-repo {{args}}
```
