# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-02T01:37:49Z |
| Iteration Count | 392 |
| Best Metric | 187 |
| Target Metric | — |
| Metric Direction | higher |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #363 |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, pending-ci, accepted, accepted, accepted, pending-ci, accepted, pending-ci |

---

## 🎯 Current Priorities

- Continue io/stats features: read_avro, wavelet transforms (DWT/CWT), state-space models (Kalman filter)

---

## 📚 Lessons Learned

- **Biome**: `useBlockStatements`=error. `useNumberNamespace`. `useSimplifiedLogicExpression`. Fix in same commit.
- **TS**: `noUncheckedIndexedAccess` → `?? fallback`. `exactOptionalPropertyTypes`. biome-ignore for node:zlib.
- **Metric**: counts `src/**/*.ts` with exports (not index.ts). One new file = +1.
- **Stats math**: logGamma, regIncGamma, normalPpf reusable across modules.
- **FFT**: Cooley-Tukey radix-2 DIT; pad to nextPow2 for non-power-of-2. `Zxx[f]![t] = val`.
- **Filters**: Butterworth → bilinear SOS. filtfilt: reverse+sosfilt+reverse.
- **ORC**: Protobuf LSB-first varints for metadata; Hadoop VInt MSB-first for data streams. `scalarToLabel()` avoids `as`.
- **ACF/PACF (iter 392)**: Use `noNonNullAssertion`-safe destructuring for polynomial coefficients. Split `regIncGamma` into series + CF helpers for `noExcessiveCognitiveComplexity`. Use `Number.NEGATIVE_INFINITY`/`Number.POSITIVE_INFINITY` not `-Infinity`/`Infinity`.
- **Lost Commits (iters 389–391)**: Commits were recorded as accepted but never reached the branch. Iter 392 re-implements `acf_pacf.ts` (previously planned for iter 389). The state file's `Best Metric` was over-counted (recorded 188, actual was 186 at baseline).

---

## 🚧 Foreclosed Avenues

- Adding offset/frequency classes to existing files: no metric gain (already exported)

---

## 📊 Iteration History

### Iteration 392 — 2026-07-02 01:37 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28559220424)

- **Status**: ⏳ Pending CI
- **Change**: Add `src/stats/acf_pacf.ts` (autocorr, acf, pacf, ccf, durbinWatson, ljungBox, boxPierce) — ACF with Bartlett CI, PACF via Levinson-Durbin, portmanteau tests.
- **Metric**: 187 (baseline was 186, delta: +1). Note: state file's 188 was inflated from lost commits.
- **Commit**: b3dd88e
- **Notes**: Re-implements the lost iter 389 acf_pacf module. Branch was rebased onto current main (4 new commits from PRs #364/#365). Biome fixes: split regIncGamma into helpers, use destructuring for polynomial coefficients, use `Number.POSITIVE_INFINITY`.

### Iteration 391 — 2026-07-01 14:01 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28521817278)

- **Status**: ⚠️ Lost commit (same pattern as 389/390)
- **Change**: Add `src/stats/acf_pacf.ts` and `src/stats/arima.ts`.
- **Metric**: Recorded 188 but commit 8e2d17c never reached branch.

### Iteration 390 — 2026-07-01 01:38 UTC — ⚠️ Lost commit — [Run](https://github.com/githubnext/tsb/actions/runs/28487382293)

- State file recorded as ✅ Accepted with metric=187, commit=96598fd, but commit never reached branch (same as iter 389).

### Iters 383–388 — ✅ (180→186)
- 388: orc.ts Δ+1. 387: signal.ts+filters.ts Δ+2. 386: signal re-impl. 385: signal claim. 383: information.ts. 384: push fail.

### Iters 367–382 — ✅ (157→183)
- kde, bootstrap, information, multivariate, contingency, regression, hypothesis_tests, sparse, to_excel, feather, hdf, pd.arrays, holiday calendars, offsets/frequencies, read_sas, signal.

### Iters 1–366 — ✅ (0→157)
- Core (Index, Series, DataFrame, Dtype), stats, io, merge, reshape, window, groupby, datetime, multi-index, sql, xml, stata, parquet, fwf, excel, and more.

