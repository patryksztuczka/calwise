---
name: babysit-git
description: Always use this skill before interacting with Git in any way, including inspecting changes, creating commits or branches, switching branches, merging, rebasing, tagging, pushing, or rewriting history.
---

# Babysit Git

## Commits

Write a short Conventional Commit subject that tells a human what changes and why, including the intent without ticket numbers or internal shorthand.

A scope is required: `type(scope): subject`. The scope names the part of the product the change touches (a package, app, or area such as `web`, `server`, `ci`, `deps`).

Describe the user-visible outcome, not the implementation. Phrasings like "no longer", "stop", and "keep" work well for fixes; include numbers when the change is measurable.

Bad: feat: binding health — degraded / broken / self-heal (ticket 04) - #28
Bad: fix(server): fix worktree bug
Good: feat(web): tell the user when a bound dataset no longer matches its object type
Good: fix(server): thread delete no longer fails on already-removed worktrees
Good: perf(ci): cut about a minute from every release
Good: chore(deps): bump @clerk/electron to 0.0.37
Good: chore(release): prepare v0.0.35

Do not add `Co-Authored-By` or other AI attribution trailers to commit messages.

## Branches

Start every branch name with one of these prefixes:

- `feat/`
- `bugfix/`
- `refactor/`
- `chore/`
- `hotfix/`
