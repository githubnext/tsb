# Evergreen Quota Policy

Quota is per PR and per continuous application of the `evergreen` label.

1. Quota starts when `evergreen` is applied and continues across runs while the
   label remains.
2. The per-PR budget is **5000 AI credits** (see `repo-policy.md`).
3. New commits do not reset quota by themselves.
4. Empty CI-trigger commits do not count as semantic repair attempts.
5. Cheap deterministic monitoring runs should consume little or no quota.
6. Reapplying `evergreen` after exhaustion starts a fresh quota; keep prior
   memory.

On quota exhaustion:

1. Stop work immediately.
2. Remove the `evergreen` label.
3. Add the `evergreen-exhausted` label.
4. Leave one short comment explaining quota was exhausted and that a human can
   reapply `evergreen` for a fresh quota.
5. Record future-useful memory: failure signatures and attempts to avoid.

Hard-cap errors from the AI engine are terminal. Do not retry into the same hard
cap.
