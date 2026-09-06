---
name: babysit-pr
description: Always use this skill before creating, updating, reviewing, or otherwise interacting with a pull request. It governs PR titles, descriptions, branch preparation, and commits intended for a PR.
---

# Babysit a pull request

Base the pull request title and description on the final diff, not on the branch's commit history.

Write a polished, standalone description using exactly this template — the headers are mandatory, in this order:

```markdown
## Problem

State the broken or missing behavior as a fact, in present tense, with no
"This PR..." preamble.

## Solution

Describe what changes in behavioral terms — a paragraph for a small change,
bullets for a larger one — and name what explicitly does not change so the
reviewer knows the blast radius (e.g. "Error states for other providers are
unchanged").

## Verification

- The actual commands run and their results — not "tests pass" but the real
  invocations, with before/after evidence where it applies.
- If a check was skipped or bypassed (e.g. hooks), disclose it and say what
  equivalent check ran instead.

## Screenshots

Only for UI changes: labeled Before/After images. Omit the section otherwise.
```

Scale the content to the change — a three-line diff deserves one sentence per section — but never drop the Problem, Solution, and Verification headers.

Bad:

> This PR adds an Open on GitHub button to the error view. Also fixes some related issues.

Good:

> ## Problem
>
> GitHub API errors can leave a failed pull request view with only Retry, even though the pull request is still available on GitHub.
>
> ## Solution
>
> The error view now includes an Open on GitHub link built from the saved project host and pull request reference, with no extra API request. Error states for GitLab, Bitbucket, and Azure DevOps are unchanged.
>
> ## Verification
>
> - `pnpm --filter web test src/pr-error-view.test.ts` — 12 tests pass
> - `pnpm --filter web typecheck`

Do not concatenate or copy all commit messages into the description. Remove stale details that no longer match the final implementation.

Do not include `Co-Authored-By` trailers or other AI attribution footers in the pull request title or description.
