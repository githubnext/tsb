# Skill: merge-blocker-comment-reader

Read human comments only for merge-blocking signals.

Look for:
- requested changes reviews
- unresolved review threads
- comments that explicitly block merge
- comments asking for required tests, docs, screenshots, or policy decisions
- maintainer instructions that change the repair plan

Ignore non-blocking suggestions, thanks, progress chatter, and general discussion. Return a blocker map with source URLs.
