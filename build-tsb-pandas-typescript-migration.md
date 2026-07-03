# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-03T19:47:19Z |
| Iteration Count | 394 |
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
| Recent Statuses | pending-ci, accepted, pending-ci, accepted, accepted, accepted, pending-ci, accepted, pending-ci, pending-ci |

---

## 🎯 Current Priorities

- Continue io/stats features: read_avro, state-space models (Kalman filter)

---

## 📚 Lessons Learned

- **Biome/TS**: `useBlockStatements`, `useNumberNamespace`, `noUncheckedIndexedAccess`→`?? fallback`, `exactOptionalPropertyTypes`. For 2D writes: `const row=M[i]; if(row) row[j]=v`. biome-ignore for node:zlib.
- **Metric**: counts `src/**/*.ts` with exports (not index.ts). One new file = +1.
- **Stats math**: logGamma, regIncGamma, normalPpf reusable. FFT: Cooley-Tukey radix-2 DIT. Filters: Butterworth→bilinear SOS. ORC: Protobuf varints. Wavelets: QMF `loR=rev(loD)`. ACF/PACF: Levinson-Durbin, Bartlett CI.
- **ARIMA (iter 394)**: Hannan-Rissanen two-step: AR(kMax) Yule-Walker for proxy residuals, then OLS with AR+MA lags. Forecast CIs via ψ-weight recursion. kMax=min(max(p+q+5,3),n/5).
- **Lost Commits (iters 389–391)**: recorded as accepted but never reached branch. Best Metric was over-counted (188 recorded, 186 actual at baseline).

---

## 🚧 Foreclosed Avenues

- Adding offset/frequency classes to existing files: no metric gain (already exported)

---

## 📊 Iteration History

### Iteration 394 — 2026-07-03 19:47 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28679535252)

- **Status**: ⏳ Pending CI
- **Change**: Add `src/stats/arima.ts` — ARIMA(p,d,q) estimation via Hannan-Rissanen two-step CSS, in-sample predict(), multi-step forecast() with 95% CIs via ψ-weights, AIC/BIC. Playground page added.
- **Metric**: 188 (delta: +1)
- **Commit**: ac1100a
- **Notes**: Rebased onto main (6 ahead, 6 behind → 0 behind). Adds AR/MA/ARMA special cases. Property-tested with fast-check. kMax = min(max(p+q+5,3), n/5) for proxy residuals.

### Iters 1–393 — (0→187, several pending-ci)
- Core (Index, Series, DataFrame, Dtype), stats (signal, filters, orc, information, kde, bootstrap, multivariate, contingency, regression, hypothesis_tests, acf_pacf), io (sparse, to_excel, feather, hdf, arrays, read_sas), and more. Iters 389–393 have pending-ci status.

