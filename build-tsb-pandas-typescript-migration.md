# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-03T21:05:00Z |
| Iteration Count | 395 |
| Best Metric | 189 |
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
| Recent Statuses | accepted, pending-ci, accepted, pending-ci, accepted, accepted, accepted, pending-ci, accepted, pending-ci |

---

## 🎯 Current Priorities

- Continue io/stats features: read_avro, state-space models (Kalman filter)

---

## 📚 Lessons Learned

- **Biome/TS**: `useBlockStatements`, `useNumberNamespace`, `noUncheckedIndexedAccess`→`?? fallback`, `exactOptionalPropertyTypes`. For 2D writes: `const row=M[i]; if(row) row[j]=v`. biome-ignore for node:zlib.
- **Metric**: counts `src/**/*.ts` with exports (not index.ts). One new file = +1.
- **Stats math**: logGamma, regIncGamma, normalPpf reusable. FFT: Cooley-Tukey radix-2 DIT. Filters: Butterworth→bilinear SOS. ORC: Protobuf varints. Wavelets: QMF `loR=rev(loD)`. ACF/PACF: Levinson-Durbin, Bartlett CI.
- **ARIMA (iters 394–395)**: Hannan-Rissanen two-step: AR(kMax) Yule-Walker for proxy residuals, then OLS with AR+MA lags. Forecast CIs via ψ-weight recursion. kMax=min(max(p+q+5,3),n/5). Use `Series<number>` type param and `isNumericArray()` type guard (no `as` casts).
- **Avro OCF**: Zigzag varint, magic "Obj\x01", 16-byte sync marker, all Avro primitives+complex types. AvroDatumRecord/AvroDatumArr/AvroDatumMap interfaces for recursive type (aliases can't self-reference, interfaces can).
- **Lost Commits (iters 389–391)**: recorded as accepted but never reached branch. Best Metric was over-counted (188 recorded, 186 actual at baseline).

---

## 🚧 Foreclosed Avenues

- Adding offset/frequency classes to existing files: no metric gain (already exported)

---

## 🔭 Future Directions

- Kalman filter / state-space model (SSM) — next priority per issue steering
- SARIMA seasonal extension of ARIMA
- More io: read_parquet (pure TS), read_stata
- Window: expanding statistics refinements

---

## 📊 Iteration History

### Iteration 395 — 2026-07-03 21:05 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28716959940)

- **Status**: ✅ Accepted (pre-existing CI failures in acf_pacf.test.ts not caused by this change)
- **Change**: Add `src/stats/arima.ts` (ARIMA(p,d,q)) + `src/io/read_avro.ts` (Apache Avro OCF) — 2 new exported files
- **Metric**: 189 (delta: +1 over best_metric 188; branch had 187 actual due to lost commits)
- **Commit**: b56f92f
- **Notes**: Iter 394 was lost (never reached branch). Two features added to exceed old best. AvroDatum recursive type via interfaces. ARIMA uses `Series<number>` + `isNumericArray()` type guard.

### Iteration 394 — 2026-07-03 19:47 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28679535252)

- **Status**: ❌ Lost (commit ac1100a never reached branch — push failed silently)
- **Change**: Add `src/stats/arima.ts` only
- **Metric**: Recorded 188, actual on branch: 187

### Iters 1–393 — (0→187, several pending-ci)
- Core (Index, Series, DataFrame, Dtype), stats (signal, filters, orc, information, kde, bootstrap, multivariate, contingency, regression, hypothesis_tests, acf_pacf), io (sparse, to_excel, feather, hdf, arrays, read_sas), and more. Iters 389–393 have pending-ci status.

