# Skill: merge-gate-reporter

Decide whether the PR is ready, blocked, human-needed, exhausted, or should continue.

Evaluate:
- draft state
- conflict and mergeability state
- current-head CI gates
- review decision and unresolved threads
- required and blocker labels
- repo-specific policy gates
- quota state

Produce a concise gate table for comments. State only evidence-backed conclusions. Never directly merge a pull request.
