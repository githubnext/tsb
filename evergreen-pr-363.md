# Evergreen Run — PR #363

**Branch:** `autoloop/build-tsb-pandas-typescript-migration`
**Last run:** 2025-08 (iteration 387: signal processing and digital filters)
**Status:** Changes pushed — awaiting CI

## Commit pushed

```
0744767 Fix TypeScript errors and convert signal/filters playgrounds to runtime
```

## Changes made

### TypeScript fixes (7 errors)
1. `src/stats/filters.ts:61` — `out[i+j] = (out[i+j] ?? 0) + ...` (undefined array element)
2. `src/stats/signal.ts:662` — conditional spread for `exactOptionalPropertyTypes` in `welch()` → `periodogram()` call
3. `src/io/orc.ts:1088` — `DataFrame.fromColumns(cols, { index: indexArr })` (was `df.setIndex(new Index(...))`)
4. `src/io/orc.ts:1136` — `df.shape[0]` (was `df.height` — property doesn't exist)
5. `tests/io/orc.test.ts:222` — `rt.shape[0]` (was `rt.height`)
6. `tests/io/orc.test.ts:270` — `readOrc(new Uint8Array(ab))` (was `readOrc(ab)` — SharedArrayBuffer)
7. `tests/stats/filters.test.ts:230,369` — `const sos: SOSSection[] = [[...]]` (was `as const`)
8. `src/io/orc.ts` — removed unused `Index` import

### Playground rewrites (E2E fix)
- `playground/signal.html` — full rewrite from esm.sh to playground-runtime.js (9 cells)
- `playground/filters.html` — full rewrite from esm.sh to playground-runtime.js (7 cells)

## CI failures targeted
- `Test & Lint` — `tsc --noEmit` had 7 errors → fixed
- `Playground E2E (Playwright)` — signal/filters had no `.playground-run` buttons → fixed by rewrite
