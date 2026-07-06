# Git Workflow (rules)

A standard, trunk-based feature-branch workflow. `main` is always releasable.
**Never merge to `main` without the user's explicit request.**

## Core rules

1. **`main` is protected.** Never commit directly to `main`. Never merge, rebase
   onto, fast-forward, or push to `main` unless the user explicitly asks for it.
2. **All work happens on a branch.** Before starting any change, create a feature
   branch off the latest `main`.
3. **One branch = one logical unit of work.** Keep branches focused and short-lived.
4. **Commit automatically per scope; push only when asked.** Commit on your own
   once a logical scope of work is complete (a feature, fix, or self-contained
   unit) — don't ask first, just follow the commit conventions below. Exceptions:
   if the user explicitly said *not* to commit at this point, honour that until
   they say otherwise; and if they explicitly ask for a commit at a specific
   moment, commit then as asked. **Push is still only on the user's explicit
   request** — never push unprompted.

## Before starting work — always verify the current branch

**Every time, before the first change of any work session — including an
already-running / resumed session — confirm which branch you are on.** Sessions can
resume on a different branch than expected, and a checkout can move the working tree
out from under you. Do not trust memory of "the branch we were on."

```bash
git branch --show-current   # confirm it's the intended branch
git status --short          # confirm a clean (or expected) working tree
```

If you are not on the intended branch, switch to it (or create it off the latest
`main`) **before** making any edits. A surprising amount of lost or misplaced work
traces back to editing on the wrong branch — files looking "reverted" usually means
you are simply on another branch, not that changes were lost.

## Branch naming

`<type>/<short-kebab-description>`, where `<type>` is one of:

| Type        | Use for                                                 |
| ----------- | ------------------------------------------------------- |
| `feat`      | new feature or capability                               |
| `fix`       | bug fix                                                 |
| `docs`      | documentation only                                      |
| `refactor`  | code change that neither fixes a bug nor adds a feature |
| `chore`     | tooling, config, deps, housekeeping                     |
| `test`      | adding or fixing tests                                  |

Examples: `feat/typography-mixins`, `fix/button-focus-ring`, `docs/git-workflow`.

## Day-to-day flow

```bash
# 1. Start from an up-to-date main
git checkout main
git pull --ff-only origin main

# 2. Create a focused feature branch
git checkout -b feat/<short-description>

# 3. Work, then commit automatically in small, meaningful steps once a scope is done
git add <paths>
git commit -m "feat: <imperative summary>"

# 4. Keep the branch current by rebasing on main (preferred over merge)
git fetch origin
git rebase origin/main

# 5. Push the branch (only when asked)
git push -u origin feat/<short-description>
```

## Commit messages (Conventional Commits)

```
<type>(<optional-scope>): <imperative, lower-case summary>

<optional body — what & why, not how>
```

- Use the same `<type>` set as branch names (`feat`, `fix`, `docs`, …).
- Subject line ≤ ~72 chars, imperative mood ("add", not "added").
- Examples: `feat(typography): add SCSS typography mixins`,
  `fix(button): restore visible focus ring`.

## Integrating into `main` — only on the user's request

When (and only when) the user asks to integrate a branch:

1. Make sure the branch is rebased on the latest `origin/main` and the build/tests pass.
2. Prefer a **Pull Request** for review; merge with the user's chosen strategy
   (squash merge is a sensible default for a clean history).
3. After merge, delete the feature branch (local and remote).

```bash
# Open a PR (does NOT merge — safe to prepare without an explicit merge request)
gh pr create --base main --head feat/<short-description>

# Merge ONLY after the user explicitly asks:
gh pr merge --squash --delete-branch
```

## Don't

- ❌ `git push origin main`, merge a feature branch into `main`, or fast-forward
  `main` without an explicit user request.
- ❌ Force-push to `main` (or any shared branch) — ever.
- ❌ Commit unrelated changes together; keep each branch and commit focused.
- ❌ Leave merged branches lingering — delete them after integration.
