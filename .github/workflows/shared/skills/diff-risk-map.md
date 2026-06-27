# Skill: diff-risk-map

Classify changed files so the orchestrator can choose focused repair skills.

Risk classes:
- tests only
- docs or examples
- playground/browser UI
- public API or exported TypeScript
- core data structure behavior
- I/O or golden snapshot behavior
- dependency or lockfile
- CI, workflow, or agent configuration
- Autoloop generated or program files
- benchmark or performance behavior

Report:
- The primary risk class.
- Conditional skills that should run and why.
- Files that require human confirmation before edit under the installed policy.
