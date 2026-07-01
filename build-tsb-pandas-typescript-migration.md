# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-01T14:01:53Z |
| Iteration Count | 391 |
| Best Metric | 188 |
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
| Recent Statuses | accepted, accepted, accepted, accepted, pending-ci, accepted, accepted, accepted, pending-ci, accepted |

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
- **ACF/PACF**: Levinson-Durbin for PACF. Bartlett CI for ACF. Chi-squared CDF via incomplete gamma (Lanczos + series). Separate k=0 case to satisfy `exactOptionalPropertyTypes`.
- **ARIMA**: Yule-Walker AR via Gram matrix + Gaussian elimination. Hannan-Rissanen 2-step for MA. autoArima via AIC/BIC grid search. Use `Number.NaN` (not `NaN`) for Biome compliance.
- **Lost Commits (iters 389, 390)**: Commits d3e66e0 and 96598fd were recorded as accepted but never reached the branch. Pattern: state file updated but push silently dropped. Iter 391 re-implements both files in a single commit on top of iter 388 (186-file baseline).

---

## 🚧 Foreclosed Avenues

- Adding offset/frequency classes to existing files: no metric gain (already exported)

---

## 📊 Iteration History

### Iteration 391 — 2026-07-01 14:01 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28521817278)

- **Status**: ✅ Accepted
- **Change**: Add `src/stats/acf_pacf.ts` (autocorr, acf, pacf, ccf, durbinWatson, ljungBox, boxPierce) and `src/stats/arima.ts` (ARIMA class with Yule-Walker AR + Hannan-Rissanen MA, autoArima, difference, integrate). Full tests and playground pages for both.
- **Metric**: 188 (previous best: 187, delta: +1)
- **Commit**: 8e2d17c
- **Notes**: Iters 389 (d3e66e0) and 390 (96598fd) commits were both lost. Actual branch was at iter 388 (186 files). This commit adds both acf_pacf.ts AND arima.ts on top of 188.

### Iteration 390 — 2026-07-01 01:38 UTC — ⚠️ Lost commit — [Run](https://github.com/githubnext/tsb/actions/runs/28487382293)

- State file recorded as ✅ Accepted with metric=187, commit=96598fd, but commit never reached branch (same as iter 389).

### Iters 383–388 — ✅ (180→186)
- 388: orc.ts Δ+1. 387: signal.ts+filters.ts Δ+2. 386: signal re-impl. 385: signal claim. 383: information.ts. 384: push fail.

### Iters 367–382 — ✅ (157→183)
- kde, bootstrap, information, multivariate, contingency, regression, hypothesis_tests, sparse, to_excel, feather, hdf, pd.arrays, holiday calendars, offsets/frequencies, read_sas, signal.

### Iters 1–366 — ✅ (0→157)
- Core (Index, Series, DataFrame, Dtype), stats, io, merge, reshape, window, groupby, datetime, multi-index, sql, xml, stata, parquet, fwf, excel, and more.

