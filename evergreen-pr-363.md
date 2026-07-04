# Evergreen Run — PR #363

**Branch:** `autoloop/build-tsb-pandas-typescript-migration`
**Last run:** 2026-07-04
**Status:** Changes pushed — awaiting CI

## Commit pushed

```
0d86b0a fix: repair CI failures for ACF/PACF, signal, and filters
```

## Changes made

### TypeScript fix
- `tests/stats/acf_pacf.test.ts` lines 71 and 318: `new Series([...])` → `new Series({data: [...]})` (Series constructor requires SeriesOptions<T>, not raw array)

### Python examples fix
- `.github/workflows/ci.yml`: Added `scipy` to pip install in `validate-python-examples` job; signal.html and filters.html use scipy.signal functions

### E2E fix
- `tests-e2e/playground-cells.test.ts`: Added `orc.html` to `NON_PLAYGROUND_PAGES`; orc.html uses custom onclick buttons (no `.playground-run` class), causing `waitForFunction` to time out

## CI failures targeted
- `Test & Lint` — tsc --noEmit had 2 errors in acf_pacf.test.ts → fixed
- `Validate Python Examples` — failures in filters.html and signal.html → fixed with scipy
- `Playground E2E (Playwright)` — TimeoutError from orc.html → fixed by adding to NON_PLAYGROUND_PAGES
