# Evergreen Run — PR #363

**Branch:** `autoloop/build-tsb-pandas-typescript-migration`
**Last run:** 2026-07-06
**Status:** Changes pushed — awaiting CI

## Commits pushed (this run)

```
167062d fix: repair TypeScript errors in kalman.ts, E2E orc.html exclusion, and scipy dep
```

## Changes made

### src/stats/kalman.ts
- `MutMat[][]` → `MutMat[]` for `filtCovs`, `predCovs`, `innovCovs`, `smoothCovs`, `gains` (MutMat = number[][], so MutMat[] is 3D, correct for T×n×n matrices)
- `ci[j] += X` → `ci[j] = (ci[j] ?? 0) + X` for noUncheckedIndexedAccess

### tests/stats/kalman.test.ts
- Removed 8 invalid `as [number][][]` casts; number[][] is directly assignable without cast

### tests/stats/acf_pacf.test.ts
- Lines 71 and 318: `new Series([...])` → `new Series({data: [...]})` (Series constructor requires SeriesOptions<T>)

### tests-e2e/playground-cells.test.ts
- Added `"orc.html"` to `NON_PLAYGROUND_PAGES`; orc.html uses custom onclick buttons, no `.playground-run` class

### .github/workflows/ci.yml
- Added `scipy` to pip install in `validate-python-examples` job

## CI failures targeted
- `Test & Lint` — tsc --noEmit: 14+ errors in kalman.ts + 2 errors in acf_pacf.test.ts
- `Validate Python Examples` — scipy missing for filters.html and signal.html
- `Playground E2E (Playwright)` — TimeoutError from orc.html
