# Evergreen Session Notes

## 2026-07-06 — Session fixes

### PR #363 (autoloop/build-tsb-pandas-typescript-migration)
Fixed 3 CI failures:
1. **Test & Lint (TypeScript errors)**:
   - `src/stats/kalman.ts`: `MutMat[][]` → `MutMat[]` for `filtCovs`, `predCovs`, `innovCovs`, `smoothCovs`, `gains` (extra array dimension)
   - `tests/stats/kalman.test.ts`: `as [number][][]` → `as number[][]` (8 places)
   - `tests/stats/acf_pacf.test.ts`: `new Series([...])` → `new Series({data: [...]})`
2. **Playground E2E (Playwright timeout)**:
   - `orc.html` uses custom `onclick` buttons, not `class="playground-run"` — added to `NON_PLAYGROUND_PAGES`
3. **Validate Python Examples**:
   - `filters.html` + `signal.html` use `scipy.signal` — added `scipy==1.14.1` to CI pip install

### PR #369 (goal/349-goal-add-rust-wasm-acceleration-coverage-for-core-functions)
Fixed 1 CI failure:
1. **Test & Lint (TypeScript errors)**:
   - `src/core/series.ts`: Radix sort code had `!` non-null assertions removed (per project rules)
     but `?? 0` fallbacks not added → added `?? 0` to all Uint32Array/Float64Array index reads
     (fvalsU32[fsi], _rxHisto[idx], srcBuf[si], finSlice[i], nanBuf[i], _fvals[0])

## Previously archived (2026-07-05)
- PR #363 pushed fix for acf_pacf TypeScript + scipy + E2E orc timeout
- PR #369 pushed fix for series.ts lint errors (complexity + noNonNullAssertion)
