# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-07T03:30:00Z |
| Iteration Count | 399 |
| Best Metric | 192 |
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

- Add GARCH(p,q) volatility model (was iter 398 pending-ci, never confirmed pushed — retry)
- More io: read_parquet already exists (parquet.ts is exported); consider read_pickle or additional formats

---

## 📚 Lessons Learned

- **Biome/TS**: `noUncheckedIndexedAccess`→`?? 0`, `exactOptionalPropertyTypes`, `readonly` arrays. For 2D writes: `const row=M[i]; if(row) row[j]=v`. `slice()` on `readonly T[]` returns mutable `T[]`.
- **Metric**: counts `src/**/*.ts` with exports (not index.ts). One new file = +1.
- **Stats math**: Hannan-Rissanen, Levinson-Durbin, FFT Cooley-Tukey, Butterworth bilinear SOS, ACF/PACF Bartlett CI, Kalman Joseph form.
- **SARIMA (399)**: CSS via Nelder-Mead on differenced series. `polyMul` for combined AR/MA poly. Store last seasonal/regular values for forecast undifferencing. Fitted values: `y[t] - eps[t - offset]` where `offset = d + D*s` (NOT undiffAll on wHat). Series constructor: `new Series<T>({ data: arr })`. `fc.float` bounds need `Math.fround`.
- **Avro/IO**: Zigzag varint, AvroDatum* interfaces for recursive types (interfaces self-ref, aliases can't).

---

## 🚧 Foreclosed Avenues

- Adding offset/frequency classes to existing files: no metric gain (already exported)
- **Phantom commits**: Iter 397 SARIMA and iter 398 GARCH were recorded but never actually pushed. Always verify via `push_to_pull_request_branch`.

---

## 🔭 Future Directions

- GARCH/volatility models — retry (iter 398 phantom, not yet in branch)
- Prophet-style additive seasonal decomposition (trend + seasonal + holiday)
- VAR (Vector AutoRegression) — multivariate time series
- State-space DLM (Dynamic Linear Model) — generalization of Kalman

---

## 📊 Iteration History

### Iteration 399 — 2026-07-07 03:30 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28926111995)

- **Status**: ✅ Accepted
- **Change**: Add `src/stats/sarima.ts` — SARIMA(p,d,q)(P,D,Q)s seasonal ARIMA model
- **Metric**: 192 (previous best: 191, +1)
- **Notes**: CSS via Nelder-Mead on seasonally/regularly differenced series. `polyMul` for combined ARMA polynomials. ψ-weight prediction intervals integrated through diff filters. 44 tests passing. Playground at `playground/sarima.html`.

### Iteration 398 — 2026-07-07 01:28 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28834925122)

- **Status**: ❌ Phantom (never pushed — `push_to_pull_request_branch` not called)
- **Change**: Attempted `src/stats/garch.ts` — GARCH(p,q) conditional volatility model
- **Metric**: Not applied (phantom)
- **Notes**: Commit 8cf6ed2 existed locally but was never pushed to remote. Real metric at that point was 191 (from iter 396 ETS).

### Iters 1–397 — (0→191): Core (Index, Series, DataFrame, Dtype), stats (ACF/PACF, ARIMA, Kalman, ETS, etc.), io (CSV, JSON, Excel, Parquet, HDF5, Feather, Avro, ORC, SAS, Stata, FWF, XML, SQL) and more.

