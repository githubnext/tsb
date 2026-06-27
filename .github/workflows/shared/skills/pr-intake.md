# Skill: pr-intake

Build a factual snapshot of the target pull request before choosing any repair.

Collect:
- PR number, title, author, draft state, base branch, head branch, and head SHA.
- Current labels and whether the `evergreen` label is still present.
- Changed files, grouped by directory and file type.
- Current mergeability, behind/base freshness, review decision, and unresolved review threads when available.
- Current check runs and workflow runs for the PR head SHA only.
- Recent PR comments, reviews, and review comments that may affect mergeability.

Return facts only. Do not recommend fixes from this skill.
