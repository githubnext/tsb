# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-06T14:09:30Z |
| Iteration Count | 397 |
| Best Metric | 191 |
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
| Recent Statuses | pending-ci, accepted, pending-ci, accepted, accepted, accepted, pending-ci, accepted, accepted, accepted |

---

## 🎯 Current Priorities

- Continue io/stats features: read_parquet (pure TS), GARCH/volatility models

---

## 📚 Lessons Learned

- **Biome/TS**: `noUncheckedIndexedAccess`→`?? 0`, `exactOptionalPropertyTypes`, `readonly` arrays. For 2D writes: `const row=M[i]; if(row) row[j]=v`. `slice()` on `readonly T[]` returns mutable `T[]`.
- **Metric**: counts `src/**/*.ts` with exports (not index.ts). One new file = +1.
- **Stats math**: Hannan-Rissanen, Levinson-Durbin, FFT Cooley-Tukey, Butterworth bilinear SOS, ACF/PACF Bartlett CI, Kalman Joseph form.
- **SARIMA (397)**: Combined multiplicative lag set {i+js}. DiffLevel stack for seasonal+regular diff undo. `arProxy: readonly number[]` typed variable avoids `as` cast.
- **Avro/IO**: Zigzag varint, AvroDatum* interfaces for recursive types (interfaces self-ref, aliases can't).

---

## 🚧 Foreclosed Avenues

- Adding offset/frequency classes to existing files: no metric gain (already exported)

---

## 🔭 Future Directions

- Kalman filter / state-space model (SSM) — ✅ Done (iter 396)
- SARIMA seasonal extension of ARIMA — ✅ Done (iter 397)
- GARCH/volatility models — next candidate
- More io: read_parquet (pure TS)

---

## 📊 Iteration History

### Iteration 397 — 2026-07-06 14:09 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28797575617)

- **Status**: ✅ Accepted
- **Change**: Add `src/stats/sarima.ts` — SARIMA(p,d,q)(P,D,Q)[s] multiplicative seasonal ARIMA model
- **Metric**: 191 (best: 190, +1)
- **Commit**: 7824921
- **Notes**: Extended Hannan-Rissanen with combined multiplicative lag set. Seasonal+regular differencing via DiffLevel stack. Full test suite + playground page.

### Iteration 396 — 2026-07-05 13:24 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28742188479)

- **Status**: ✅ Accepted
- **Change**: Add `src/stats/kalman.ts` — Kalman filter & RTS smoother
- **Metric**: 190 (best: 189, +1)
- **Commit**: 758d4d5

### Iters 394–396 — ✅ (metrics 187→190): ARIMA+Avro (395), Kalman filter (396), lost commit (394).

### Iters 1–393 — (0→187): Core (Index, Series, DataFrame, Dtype), stats, io and more.

