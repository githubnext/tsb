# Skill: dependency-gate-repair

Use this when dependency installation, lockfiles, package manifests, or supply-chain checks block mergeability.

This repository has zero core dependencies. Treat changes to `package.json`, `bun.lock`, `tsconfig.json`, `biome.json`, and `bunfig.toml` as high-risk protected edits unless the PR is explicitly about dependency/tooling work. If a protected edit is required, label `evergreen-human-needed` and explain the smallest requested human action.
