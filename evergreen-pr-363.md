# Evergreen Run — PR #363

**Branch:** `autoloop/build-tsb-pandas-typescript-migration`
**Last run:** 2026-07-08
**Status:** Changes pushed — awaiting CI

## Commit pushed

```
ecdb2f1 fix: resolve CI failures in kalman, ets, acf_pacf, E2E, and Python validation
```

## Changes made

### src/stats/kalman.ts
- `mmul` line 83: `ci[j] += ...` → `ci[j] = (ci[j] ?? 0) + ...` (TS2532 noUncheckedIndexedAccess)
- `filtCovs`, `predCovs`, `innovCovs`: `MutMat[][] → MutMat[]` (were wrongly double-nested)
- `smoothCovs`, `gains`: `MutMat[][] = new Array<MutMat[]>` → `MutMat[] = new Array<MutMat>`

### src/stats/ets.ts
- Changed `import type { Series }` → `import { Series }` from core/index.ts
- `toArr()`: `if (Array.isArray(y)) return y; return y.values` → `if (y instanceof Series) return y.values; return y`
  (Array.isArray didn't narrow `readonly number[]` away from `Series<number>` properly in strict TS)

### tests/stats/acf_pacf.test.ts
- Lines 71, 318: `new Series([...])` → `new Series({data: [...]})` (Series requires SeriesOptions)

### tests/stats/kalman.test.ts
- 8 occurrences of `as [number][][]` removed — TypeScript refuses conversion from `number[][]` to `[number][][]`

### .github/workflows/ci.yml
- Added `scipy==1.14.1` to validate-python-examples pip install (signal.html, filters.html need scipy)

### tests-e2e/playground-cells.test.ts
- Added `orc.html` to NON_PLAYGROUND_PAGES (has no .playground-run buttons → waitForFunction timeout)

## CI failures targeted
- Test & Lint (tsc): ~25 TypeScript errors in kalman.ts, ets.ts, acf_pacf.test.ts, kalman.test.ts
- Validate Python Examples: ModuleNotFoundError: No module named 'scipy'
- Playground E2E: TimeoutError on orc.html (no .playground-run buttons)
