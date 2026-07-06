# Evergreen Session Notes

## 2026-07-06 — Session 2 fixes

### PR #363 (autoloop/build-tsb-pandas-typescript-migration)
Autoloop had added Iterations 393, 395, 396 (ACF/PACF, ARIMA/Avro, Kalman) since last session, re-introducing CI failures. Fixed:
1. **Test & Lint (TypeScript errors)**:
   - `src/stats/kalman.ts`: `MutMat[][]` → `MutMat[]` for `filtCovs`, `predCovs`, `innovCovs`, `smoothCovs`, `gains` (extra array dimension)
   - `tests/stats/kalman.test.ts`: `as [number][][]` → `as number[][]` (8 places)
   - `tests/stats/acf_pacf.test.ts`: `new Series([...])` → `new Series({data: [...]})`
2. **Playground E2E (Playwright timeout)**:
   - `orc.html` uses custom `onclick` buttons — added to `NON_PLAYGROUND_PAGES`
3. **Validate Python Examples**:
   - `filters.html` + `signal.html` use `scipy.signal` — added `scipy==1.14.1` to CI pip install
   - NOTE: My previous session fix for this was lost (autoloop rewrote ci.yml in new iterations)

### PR #369 (goal/349-goal-add-rust-wasm-acceleration-coverage-for-core-functions)
Fix: `noUncheckedIndexedAccess` errors in `series.ts` radix sort. With `noUncheckedIndexedAccess: true`, typed array reads return `T | undefined`. Added `?? 0` to:
- `fvalsU32[fsi]`, `fvalsU32[fsi+1]` (lo/hi initialization)
- 8x `_rxHisto[idx]` reads in histogram accumulation
- `_rxHisto[base+b]` in prefix-sum loop
- `srcBuf[si+keyOff]`, `_rxHisto[histoBase+bucket]` in scatter loop
- `srcBuf[si..si+2]` in scatter writes
- 4 srcBuf output loops, 4 finSlice/nanBuf output loops

## Archived (2026-07-05 session 1)
- PR #363: pushed scipy/orc/acf_pacf fixes (lost when autoloop added new iterations)
- PR #369: pushed noNonNullAssertion Biome lint fixes (complexity + `!` removal) — those were BIOME fixes, NOT tsc fixes. The tsc errors (noUncheckedIndexedAccess) remained unfixed until this session.
