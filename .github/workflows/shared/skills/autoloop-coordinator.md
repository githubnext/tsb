# Skill: autoloop-coordinator

Use this for PRs from `autoloop/**` branches or PRs labeled `autoloop`.

Coordinate with the installed Autoloop conventions:
- Do not edit `.autoloop/programs/**`.
- Treat duplicate push and pull_request CI runs as one logical gate.
- For `autoloop/*-evolve` branches, include `OpenEvolve benchmark` when deciding readiness.
- Prefer fixing merge blockers over continuing feature iteration.
- Preserve evidence that Autoloop can use after Evergreen finishes.
