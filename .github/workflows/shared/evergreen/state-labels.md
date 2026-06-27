# Evergreen State Labels

Use labels as current state, not as a run log.

- `evergreen`: persistent opt-in and permission for Evergreen to work on a PR.
- `evergreen-ready`: all configured merge gates currently pass.
- `evergreen-blocked`: a blocker exists, but Evergreen may keep monitoring.
- `evergreen-human-needed`: a human decision, credential, review, or protected edit is required.
- `evergreen-exhausted`: quota was exhausted; remove `evergreen` when applying this label.

Remove stale state labels when the underlying state changes. For example, remove `evergreen-ready` after a new commit, stale check, failing gate, or newly discovered blocker.
