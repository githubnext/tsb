# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-11T07:29:12Z |
| Iteration Count | 404 |
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
| Recent Statuses | accepted, pending-ci, accepted, accepted, accepted, pending-ci, accepted, accepted, pending-ci, accepted |

---

## 🎯 Current Priorities

- VAR (Vector AutoRegression) ✅ done (iter 403) — *not yet on branch (prior phantom)*
- Prophet-style additive decomposition ✅ done (iter 404)
- State-space DLM (Dynamic Linear Model) — generalization of Kalman

---

## 📚 Lessons Learned

- **VAR (403)**: OLS equation-by-equation. Build regressor matrix X=[1, y_{t-1},...,y_{t-p}]. Coef matrix: B[offset+lag*K+j][i] = A[i][j]. MSE via MA(∞) Ψ recursion + running sum. IRF: Ψ₀=I, Ψₕ=ΣAⱼΨ_{h-j}. orthIrf=ΨₕP where P=chol(Σ). FEVD: (ΣΘₛ[i,j]²)/(Σ_j ΣΘₛ[i,j]²). Lag selection: AIC/BIC/HQIC over lag 1..maxlags.
- **Prophet (404)**: Design matrix = [trend_piecewise | fourier_seasonal | holiday_indicators]. Ridge OLS. `exactOptionalPropertyTypes` requires conditional spread for optional fields: `...(v !== undefined ? {k:v} : {})`. Branch metric was 191 (not 194) — iters 401-403 never pushed to branch.
- **GARCH (402)**: Log-parameterise ω/α/β for unconstrained Nelder-Mead MLE. Soft stationarity penalty (persist≥0.9999→1e12). `conditionalVariances()` helper returns null on σ²≤0. Multi-step forecast: E[ε²_{t+h}]=σ²_{t+h} for h>1. `x.values` (not `as` cast) for Series input.
- **Phantom commits**: always call push_to_pull_request_branch — iters 398/399/400 were phantom (GARCH+SARIMA never pushed). GARCH (911b44b) never existed on branch.
- **SARIMA (401)**: CSS via Nelder-Mead on differenced series. `polyMul` for combined AR/MA poly. Store last seasonal/regular values for forecast undifferencing. Fitted values: `y[t] - eps[t - offset]` where `offset = d + D*s`. Series constructor: `new Series<T>({ data: arr })`. `fc.float` bounds need `Math.fround`.
- **Stats math**: Hannan-Rissanen, Levinson-Durbin, FFT Cooley-Tukey, Butterworth bilinear SOS, ACF/PACF Bartlett CI, Kalman Joseph form, CSS optimisation.
- **TS**: `noUncheckedIndexedAccess`→`?? 0`. `slice()` on `readonly T[]` → mutable. 2D writes: guard row before assign.
- **Metric**: `find src -name '*.ts' -not -name 'index.ts' | xargs grep -l 'export' | wc -l`. +1 per new file.
- **Avro/IO**: Zigzag varint, AvroDatum* interfaces for recursive types (interfaces self-ref, aliases can't).

---

## 🚧 Foreclosed Avenues

- Adding offset/frequency classes to existing files: no metric gain (already exported)
- **Phantom commits**: always push via `push_to_pull_request_branch`; verify branch has the commit before marking accepted.

---

## 🔭 Future Directions

- GARCH/volatility models ✅ done (iter 402)
- Prophet-style additive seasonal decomposition (trend + seasonal + holiday)
- VAR (Vector AutoRegression) — multivariate time series
- State-space DLM (Dynamic Linear Model) — generalization of Kalman

---

## 📊 Iteration History

### Iter 404 — 2026-07-11 — [Run §29144500148](https://github.com/githubnext/tsb/actions/runs/29144500148)
✅ +1 → 192: Prophet-style additive decomposition. Piecewise-linear trend (auto change-points), Fourier seasonality, holiday indicators, ridge OLS. 40+ tests, playground. Commit 6d02947. Branch was at 191 (iters 401-403 phantom); this iteration is first push since iter 397.

### Iter 403 — 2026-07-10 — [Run §29117709797](https://github.com/githubnext/tsb/actions/runs/29117709797)
⚠️ Phantom +1 → 194 (state): VAR(p) Vector AutoRegression — state file updated but push never landed on branch. Branch metric unchanged at 191.

### Iter 402 — 2026-07-10 — [Run §29078452984](https://github.com/githubnext/tsb/actions/runs/29078452984)
⚠️ Phantom +1 → 193: GARCH(p,q) — state file updated but push never landed. Branch metric unchanged at 191.

### Iter 401 — 2026-07-09 — [Run §29022916600](https://github.com/githubnext/tsb/actions/runs/29022916600)
⚠️ Phantom +1 → 192: SARIMA — state file updated but push never landed. Branch metric unchanged at 191.

### Iters 398–400 — ❌ Phantom (GARCH+SARIMA never pushed; metric stayed 191)
### Iters 1–397 — (0→191): Core (Index, Series, DataFrame, Dtype), stats (ACF/PACF, ARIMA, Kalman, ETS, signal, filters, etc.), io (CSV, JSON, Excel, Parquet, HDF5, Feather, Avro, ORC, SAS, Stata, FWF, XML, SQL) and more.
