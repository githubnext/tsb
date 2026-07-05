# Evergreen Run — PR #363

**Branch:** `autoloop/build-tsb-pandas-typescript-migration`
**Last run:** 2026-07-05
**Status:** Changes pushed — awaiting CI

## Commit pushed

```
b5458df fix: repair CI failures for ACF/PACF, signal, filters, and orc E2E
```

## Changes made

### TypeScript fix
- `tests/stats/acf_pacf.test.ts` lines 71 and 318: `new Series([...])` → `new Series({data: [...]})` (Series constructor requires SeriesOptions<T>, not raw array)

### Python examples fix
- `.github/workflows/ci.yml`: Added `scipy` to pip install in `validate-python-examples` job; filters.html and signal.html use `scipy.signal` functions

### E2E fix
- `tests-e2e/playground-cells.test.ts`: Added `orc.html` to `NON_PLAYGROUND_PAGES`; orc.html uses custom onclick buttons (no `.playground-run` class), causing `waitForFunction` to time out

## CI failures targeted
- `Test & Lint` — tsc --noEmit had 2 errors in acf_pacf.test.ts → fixed
- `Validate Python Examples` — failures in filters.html (7) and signal.html (5) → fixed with scipy
- `Playground E2E (Playwright)` — TimeoutError from orc.html → fixed by adding to NON_PLAYGROUND_PAGES
