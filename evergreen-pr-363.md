# Evergreen Run — PR #363

**Branch:** `autoloop/build-tsb-pandas-typescript-migration`
**Last run:** 2026-07-09
**Status:** Changes pushed — awaiting CI

## Commit pushed (this run)

```
224c37c fix: resolve CI failures — kalman/ets types, acf_pacf Series ctor, scipy, orc E2E
```

## Changes made

### src/stats/kalman.ts
- Line 83: `ci[j] += aip * bp[j]!` → `ci[j] = (ci[j] ?? 0) + aip * bp[j]!` (TS2532 noUncheckedIndexedAccess)
- filtCovs, predCovs, innovCovs: `MutMat[][] = []` → `MutMat[] = []`
- smoothCovs: `MutMat[][] = new Array<MutMat[]>(T_len)` → `MutMat[] = new Array<MutMat>(T_len)`
- gains: `MutMat[][] = new Array<MutMat[]>(T_len)` → `MutMat[] = new Array<MutMat>(T_len)`

### src/stats/ets.ts
- `import type { Series }` → `import { Series }` (enables instanceof check)
- `toArr()`: `if (Array.isArray(y)) return y; return y.values` → `if (y instanceof Series) return y.values; return y`
  (Array.isArray false branch: y still typed as readonly number[] | Series, so y.values resolved to Array.prototype.values — a method, not Series getter)

### tests/stats/acf_pacf.test.ts
- Lines 71, 318: `new Series([...])` → `new Series({data: [...]})` (Series requires SeriesOptions)

### tests/stats/kalman.test.ts
- 8 occurrences of `as [number][][]` removed

### .github/workflows/ci.yml
- Added `scipy==1.14.1` to validate-python-examples pip install

### tests-e2e/playground-cells.test.ts
- Added `orc.html` to NON_PLAYGROUND_PAGES (uses onclick buttons, not .playground-run)

## CI failures targeted
- Test & Lint (tsc): 20+ TypeScript errors in kalman.ts, ets.ts, acf_pacf.test.ts, kalman.test.ts
- Validate Python Examples: ModuleNotFoundError: No module named 'scipy'
- Playground E2E: TimeoutError on orc.html (no .playground-run buttons)
