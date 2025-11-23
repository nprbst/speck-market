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
6. Creates reverse symlink: `<speck-root>/.speck/repos/<repo-name>` → relative path back to this repo

## Multi-Repo Workflow

After linking, you can:

- **Create shared spec**: `/speck:specify "Feature description"` (creates spec at speck root)
- **Generate local plan**: `/speck:plan` (uses this repo's constitution)
- **Check configuration**: `/speck:env` (shows multi-repo status)

## Implementation

**Path Handling:** If the provided path is relative, prepend `../` before creating the symlink (the symlink lives at `.speck/root`, one level deeper than the repo root). Example: user provides `../../speck-root` → symlink target becomes `../../../speck-root`.

**Steps:**

1. Verify the provided path exists (test with `ls <path>`)
2. If path is relative, prepend `../` to adjust for `.speck/` directory depth
3. Create symlink: `ln -s <adjusted-path> .speck/root`
4. Verify symlink works: `ls .speck/root/` should succeed
5. Get repository info:
   - Repository name from git remote (extract from URL)
   - Git remote URL (`git remote get-url origin`)
   - Relative path from speck root to this repo
   - Git user name
   - Today's date
6. Create reverse symlink at speck root:
   - Create `<speck-root>/.speck/repos/` directory if it doesn't exist
   - Calculate relative path from `<speck-root>/.speck/repos/` back to this repo
   - Create symlink: `ln -s <relative-path-back> <speck-root>/.speck/repos/<repo-name>`
7. Update `<speck-root>/.speck/linked-repos.md` by adding entry under "Active Links" section:
   - Repository name
   - Git remote URL (primary)
   - Relative path from speck root (for local development)
   - Today's date
   - Contact information (git user name or "Unknown")
   - Active features: "None yet"
   - Notes: Brief description of the repository purpose

**Example entry format:**
```markdown
### repository-name
- **Repository**: `https://github.com/org/repository-name.git`
- **Local Path**: `../frontend/master` (relative from speck root)
- **Linked**: 2025-11-23
- **Contact**: Developer Name
- **Active Features**: None yet
- **Notes**: Brief description of what this repository does
```

The entry should be added between the closing `-->` comment tag and the "## Link Management" section.
