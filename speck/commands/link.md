---
description: Link repository to multi-repo speck root
---

# Link Repository to Multi-Repo Speck Root

Creates a `.speck/root` symlink to enable multi-repo mode and registers this repository in the Speck root's linked-repos.md file.

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
5. **Automatically updates** `<path>/.speck/linked-repos.md` to register this repository

## Multi-Repo Workflow

After linking, you can:

- **Create shared spec**: `/speck:specify "Feature description"` (creates spec at speck root)
- **Generate local plan**: `/speck:plan` (uses this repo's constitution)
- **Check configuration**: `/speck:env` (shows multi-repo status)

## Implementation

After creating the symlink, you MUST update the linked-repos.md file in the Speck root:

1. Read the current repository name and path
2. Get today's date for the "Linked" field
3. Read `<speck-root>/.speck/linked-repos.md`
4. Add a new entry under the "Active Links" section with:
   - Repository name (from git remote or directory name)
   - Full absolute path to this repository
   - Today's date
   - Contact information (git user name or "Unknown")
   - Active features: "None yet"
   - Notes: Brief description of the repository purpose
5. Write the updated file back

**Example entry format:**
```markdown
### repository-name
- **Path/URL**: `/full/path/to/repository`
- **Linked**: 2025-11-23
- **Contact**: Developer Name
- **Active Features**: None yet
- **Notes**: Brief description of what this repository does
```

The entry should be added between the closing `-->` comment tag and the "## Link Management" section.
