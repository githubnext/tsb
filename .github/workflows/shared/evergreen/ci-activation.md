# Evergreen CI/CD Activation Policy

Evergreen exists mostly to satisfy existing CI. Follow these rules.

1. Treat the merge gates listed in `repo-policy.md` on the **current head SHA**
   as the source of truth. Ignore results from older SHAs.
2. Do **not** rerun green checks.
3. If a check is pending, do not patch around it unless another gate has already
   clearly failed.
4. Prefer, in order: check rerun, `workflow_dispatch` of `CI`, then a branch
   mutation. Mutate the branch only when rerun/dispatch cannot help.
5. Allow an empty commit **only** as a last resort when the repo requires a push
   event to run CI. Use commit subject `evergreen: trigger CI`. It never counts
   as a semantic repair attempt.
6. Bot/default-token pushes may not trigger required CI on this repo. When a push
   must trigger CI, rely on `GH_AW_CI_TRIGGER_TOKEN` so the push is attributed to
   an identity CI will react to. gh-aw wires this token into the safe-output push
   handler automatically.
7. There are no deployment/environment approval gates on this repo; if one is
   ever added, treat it as `human-needed` unless the token clearly has
   permission and the maintainer approved it.

Reference CI jobs (`.github/workflows/ci.yml`): `Test & Lint`,
`Playground E2E (Playwright)`, `Build`, `Validate Python Examples`, and the
autoloop-only `OpenEvolve benchmark` (not a gate).
