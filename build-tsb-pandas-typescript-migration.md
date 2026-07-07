# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-07T01:28:20Z |
| Iteration Count | 398 |
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
| Recent Statuses | pending-ci, accepted, pending-ci, accepted, accepted, accepted, pending-ci, accepted, accepted, pending-ci |

---

## 🎯 Current Priorities

- Continue stats features: SARIMA seasonal ARIMA model
- More io: read_parquet (pure TS)

---

## 📚 Lessons Learned

- **Biome/TS**: `noUncheckedIndexedAccess`→`?? 0`, `exactOptionalPropertyTypes`, `readonly` arrays. For 2D writes: `const row=M[i]; if(row) row[j]=v`. `slice()` on `readonly T[]` returns mutable `T[]`.
- **Metric**: counts `src/**/*.ts` with exports (not index.ts). One new file = +1.
- **Stats math**: Hannan-Rissanen, Levinson-Durbin, FFT Cooley-Tukey, Butterworth bilinear SOS, ACF/PACF Bartlett CI, Kalman Joseph form.
- **GARCH (398)**: Nelder-Mead works well for GARCH MLE. Log-transform ω, exp-transform α/β, enforce stationarity via scaling. safeExp clamp ±30 prevents overflow.
- **Avro/IO**: Zigzag varint, AvroDatum* interfaces for recursive types (interfaces self-ref, aliases can't).

---

## 🚧 Foreclosed Avenues

- Adding offset/frequency classes to existing files: no metric gain (already exported)
- **Foreclosed**: SARIMA (iter 397) recorded as accepted (commit 7824921) but never pushed. Real best_metric was 190.

---

## 🔭 Future Directions

- Kalman filter / state-space model (SSM) — ✅ Done (iter 396)
- GARCH/volatility models — ✅ Done (iter 398, pending CI)
- SARIMA seasonal extension of ARIMA — next candidate
- More io: read_parquet (pure TS)

---

## 📊 Iteration History

### Iteration 398 — 2026-07-07 01:28 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28834925122)

- **Status**: ⏳ Pending CI
- **Change**: Add `src/stats/garch.ts` — GARCH(p,q) conditional volatility model (Bollerslev 1986)
- **Metric**: 191 (previous best: 190, +1) — pending CI confirmation
- **Commit**: 8cf6ed2
- **Notes**: Gaussian MLE via Nelder-Mead. `GARCHModel`, `fitGarch()`, `garchUnconditionalVariance()`, `garchHalfLife()`. Supports ARCH(p,0) special case. Iter 397 SARIMA phantom commit corrected; best_metric was 190.

### Iters 1–397 — (0→190): Core (Index, Series, DataFrame, Dtype), stats (ACF/PACF, ARIMA, Kalman, etc.), io (CSV, JSON, Excel, Parquet, HDF5, Feather, Avro, ORC, SAS, Stata, FWF, XML, SQL) and more.

