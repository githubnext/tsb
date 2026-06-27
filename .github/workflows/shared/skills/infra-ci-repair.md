# Skill: infra-ci-repair

Use this when the blocker is in GitHub Actions, runner setup, package installation, workflow permissions, generated workflow locks, or CI activation.

First determine whether the failure is caused by the PR code, workflow configuration, external infrastructure, or missing credentials. For workflow-source changes under `.github/workflows/*.md`, the repo requires `gh aw compile` and `apm compile`; if the runtime cannot safely push workflow files, label `evergreen-human-needed` and comment with exact next steps.
