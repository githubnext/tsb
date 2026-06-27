# Evergreen Safe Output Policy

Use safe outputs for every visible write or branch mutation.

Allowed actions:
- Add concise PR comments.
- Add or remove only Evergreen state labels.
- Dispatch the `CI` workflow when checks are missing, stale, or blocked.
- Push repair commits to PR branches that still have the `evergreen` label.

Disallowed actions:
- Do not merge PRs.
- Do not approve PRs.
- Do not resolve review threads.
- Do not request reviewers.
- Do not use shell commands or GitHub tools for write operations that have configured safe outputs.

Before reporting success, verify the side effect with current GitHub state.
