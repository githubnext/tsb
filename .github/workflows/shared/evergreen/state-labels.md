# Evergreen State Labels

| Label | Meaning |
| --- | --- |
| `evergreen` | Persistent human opt-in. Work this PR until ready or quota exhaustion. |
| `evergreen-ready` | Configured merge gates currently appear satisfied. Keep `evergreen` so monitoring continues. |
| `evergreen-blocked` | A blocker was found, but future work may still help. |
| `evergreen-human-needed` | A human decision, credential, or protected-edit decision is required. |
| `evergreen-exhausted` | Per-PR quota is exhausted. `evergreen` is removed; reapply it to start a fresh quota. |

Rules:

- Only PRs with `evergreen` are in scope. Slash commands never bypass the label.
- Update a label only when the underlying state changes. Never use labels as a
  run log.
- `evergreen` and `evergreen-ready` coexist; readiness does not end monitoring.
- When quota is exhausted, `evergreen` is removed and `evergreen-exhausted` is
  added together.
