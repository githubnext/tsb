# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-01T01:38:54Z |
| Iteration Count | 390 |
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
| Recent Statuses | accepted, accepted, accepted, pending-ci, accepted, accepted, accepted, pending-ci, accepted, accepted |

---

## 🎯 Current Priorities

- Continue io/stats features: read_avro, wavelet transforms (DWT/CWT), ARIMA/state-space models

---

## 📚 Lessons Learned

- **Biome**: `useBlockStatements`=error. `useNumberNamespace`. `useSimplifiedLogicExpression`. Fix in same commit.
- **TS**: `noUncheckedIndexedAccess` → `?? fallback`. `exactOptionalPropertyTypes`. biome-ignore for node:zlib.
- **Metric**: counts `src/**/*.ts` with exports (not index.ts). One new file = +1.
- **Stats math**: logGamma, regIncGamma, normalPpf reusable across modules.
- **FFT**: Cooley-Tukey radix-2 DIT; pad to nextPow2 for non-power-of-2. `Zxx[f]![t] = val`.
- **Filters**: Butterworth → bilinear SOS. filtfilt: reverse+sosfilt+reverse.
- **ORC**: Protobuf LSB-first varints for metadata; Hadoop VInt MSB-first for data streams. `scalarToLabel()` avoids `as`.
- **ACF/PACF**: Levinson-Durbin for PACF. Bartlett CI for ACF. Chi-squared CDF via incomplete gamma (Lanczos + series). `void n` suppresses unused-var in inner loops.
- **State file correction**: Iteration 389 commit (d3e66e0) was lost before CI — never pushed to branch. Iteration 390 re-implements acf_pacf.ts, correcting actual best_metric to 186 before this iteration (now 187).

---

## 🚧 Foreclosed Avenues

- Adding offset/frequency classes to existing files: no metric gain (already exported)

---

## 📊 Iteration History

### Iteration 390 — 2026-07-01 01:38 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28487382293)

- **Status**: ✅ Accepted
- **Change**: Re-implement `src/stats/acf_pacf.ts` (lost iter 389 commit recovered). Adds autocorr, acf, pacf (YW+OLS), ccf, durbinWatson, ljungBox, boxPierce. Full tests + playground.
- **Metric**: 187 (previous best: 186, delta: +1)
- **Commit**: 96598fd
- **Notes**: Iteration 389 commit (d3e66e0) was lost — state file best_metric corrected to 186 before eval.

### Iteration 389 — 2026-06-30 — ⚠️ Lost commit — [Run](https://github.com/githubnext/tsb/actions/runs/28447804192)
- acf_pacf.ts commit d3e66e0 never made it to branch. State file incorrectly updated. Re-implemented in iter 390.

### Iteration 388 — 2026-06-29 — ✅ Accepted (pending CI) — [Run](https://github.com/githubnext/tsb/actions/runs/28429568433)
- Add `src/io/orc.ts` — Apache ORC reader/writer. Protobuf+VInt+RLE. Full null support.
- Metric: 185→186 (Δ+1). Commit: 4bc79cc.

### Iters 383–387 — ✅ (180→185)
- 387: signal.ts+filters.ts Δ+2. 386: signal re-impl. 385: signal claim. 383: information.ts. 384: push fail.

### Iters 367–382 — ✅ (157→183)
- kde, bootstrap, information, multivariate, contingency, regression, hypothesis_tests, sparse, to_excel, feather, hdf, pd.arrays, holiday calendars, offsets/frequencies, read_sas, signal.

### Iters 1–366 — ✅ (0→157)
- Core (Index, Series, DataFrame, Dtype), stats, io, merge, reshape, window, groupby, datetime, multi-index, sql, xml, stata, parquet, fwf, excel, and more.

