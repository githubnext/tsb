# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-05T13:24:00Z |
| Iteration Count | 396 |
| Best Metric | 190 |
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
| Recent Statuses | accepted, pending-ci, accepted, pending-ci, accepted, accepted, accepted, pending-ci, accepted, accepted |

---

## 🎯 Current Priorities

- Continue io/stats features: SARIMA, read_parquet (pure TS)

---

## 📚 Lessons Learned

- **Biome/TS**: `useBlockStatements`, `useNumberNamespace`, `noUncheckedIndexedAccess`→`?? fallback`, `exactOptionalPropertyTypes`. For 2D writes: `const row=M[i]; if(row) row[j]=v`. biome-ignore for node:zlib.
- **Metric**: counts `src/**/*.ts` with exports (not index.ts). One new file = +1.
- **Stats math**: logGamma, regIncGamma, normalPpf reusable. FFT: Cooley-Tukey radix-2 DIT. Filters: Butterworth→bilinear SOS. ORC: Protobuf varints. Wavelets: QMF `loR=rev(loD)`. ACF/PACF: Levinson-Durbin, Bartlett CI.
- **ARIMA (395)**: Hannan-Rissanen 2-step. Forecast CIs via ψ-weight recursion. `Series<number>` + `isNumericArray()` guard (no `as` casts).
- **Kalman (396)**: Matrix ops local to kalman.ts (don't import multivariate). Joseph form for P stability. `number[][]` assignable to `readonly (readonly number[])[]` directly.
- **Avro OCF**: Zigzag varint, 16-byte sync marker, AvroDatum* interfaces for recursive type (interfaces self-ref; aliases can't).
- **Lost Commits (389–391)**: accepted but never reached branch; best_metric overcounted.

---

## 🚧 Foreclosed Avenues

- Adding offset/frequency classes to existing files: no metric gain (already exported)

---

## 🔭 Future Directions

- Kalman filter / state-space model (SSM) — ✅ Done (iter 396)
- SARIMA seasonal extension of ARIMA — next priority
- More io: read_parquet (pure TS), read_stata

---

## 📊 Iteration History

### Iteration 396 — 2026-07-05 13:24 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28742188479)

- **Status**: ✅ Accepted
- **Change**: Add `src/stats/kalman.ts` — Kalman filter & RTS smoother
- **Metric**: 190 (best: 189, +1)
- **Commit**: 758d4d5

### Iteration 395 — 2026-07-03 21:05 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28716959940)

- **Status**: ✅ Accepted
- **Change**: Add `src/stats/arima.ts` + `src/io/read_avro.ts` — 2 new files
- **Metric**: 189 (best: 188, +1; branch had 187 due to lost commits)
- **Commit**: b56f92f

### Iteration 394 — 2026-07-03 19:47 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28679535252)

- **Status**: ❌ Lost (push failed silently)
- **Metric**: Recorded 188, actual: 187

### Iters 1–393 — (0→187, several pending-ci)
- Core (Index, Series, DataFrame, Dtype), stats (signal, filters, orc, information, kde, bootstrap, multivariate, contingency, regression, hypothesis_tests, acf_pacf), io (sparse, to_excel, feather, hdf, arrays, read_sas), and more.

