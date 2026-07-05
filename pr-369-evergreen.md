# Evergreen Run — PR #369

**Branch:** `goal/349-goal-add-rust-wasm-acceleration-coverage-for-core-functions`
**Last run:** 2026-07-05
**Status:** Fix pushed — awaiting CI

## Commit pushed

```
3aba5d0 fix: resolve lint errors in series.ts (complexity + noNonNullAssertion)
```

## Changes made

### Lint fix (src/core/series.ts)
- **Complexity**: Extracted `_svCacheGet()` private helper from `sortValues` to reduce cognitive complexity from 16 to 1 (max 15)
- **noNonNullAssertion**: Removed all `!` from `Uint32Array`/`Float64Array` index accesses (typed array access returns `number`, not `number | undefined`) — affected lines 897-929, 954, 970-977, 1050-1052, 1068-1070, 1085, 1092, 1099, 1107-1109, 1123-1125, 1140

## CI failures targeted
- `Test & Lint` — Biome lint failed with 3 errors (1 complexity + multiple noNonNullAssertion) → fixed

## Previous state
- PR has labels: automation, goal, evergreen
- No evergreen-ready, no evergreen-blocked
- Other gates (Playground E2E, Validate Python Examples) were passing
