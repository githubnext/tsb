# Skill: lint-policy-review

Use this when lint or formatting failures look like repository policy, not a local code mistake.

Check whether the failure can be fixed with `bun run lint:fix`. If the fix would violate strict TypeScript rules, introduce `any`, use `as`, add ignore comments, or change style configuration, stop and ask for human input with `evergreen-human-needed`.
