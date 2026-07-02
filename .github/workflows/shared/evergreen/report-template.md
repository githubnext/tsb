# Evergreen Report Templates

Keep comments short and terse. Comment only for meaningful work, blockers,
human-needed decisions, or quota exhaustion. Never comment on unchanged state.

## Repair / progress comment

```markdown
evergreen: <one-line summary of what changed>

Gates: <gate table or "N failing / M passing">
Did: <push | merged main | reran CI | dispatched CI>
Verified: <head SHA + files, from safe-output-verifier>
Next: <next action or "monitoring">
Run: <workflow-run-url>
```

## Blocked / human-needed comment

```markdown
evergreen: <blocked | needs a human>

Blocker: <the single current merge blocker>
Evidence: <logs, checks, or comment IDs>
Needed: <smallest human action that unblocks progress>
Run: <workflow-run-url>
```

## Quota-exhausted comment

```markdown
evergreen: quota exhausted for this PR

Removed `evergreen`, added `evergreen-exhausted`.
Reapply `evergreen` to start a fresh quota.
Summary: <what was tried, what remains>
Run: <workflow-run-url>
```

## Recommended commit messages

```text
evergreen: repair <gate> failures

[evergreen]
Run: <workflow-run-url-or-id>
PR: #<n>
Skills: <skills used>
Gates: <gates targeted>
```

```text
evergreen: merge main into PR branch

[evergreen]
Run: <workflow-run-url-or-id>
PR: #<n>
Reason: branch freshness gate
```

```text
evergreen: trigger CI

[evergreen]
Run: <workflow-run-url-or-id>
Reason: configured CI requires a push event
```
