# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-07-11T19:20:44Z |
| Iteration Count | 405 |
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
| Recent Statuses | pending-ci, accepted, accepted, accepted, pending-ci, accepted, accepted, pending-ci, accepted, accepted |

---

## 🎯 Current Priorities

- VAR (Vector AutoRegression) ✅ done (iter 405, commit e06ad3a)
- Prophet-style additive decomposition — implement next (iter 404 was phantom)
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

### Iter 405 — 2026-07-11 — [Run §29165013587](https://github.com/githubnext/tsb/actions/runs/29165013587)
✅ +1 → 192 (branch): VAR(p) Vector AutoRegression. OLS equation-by-equation, IRF, orthogonalized IRF (Cholesky), FEVD, multi-step forecast, lag selection (AIC/BIC/HQIC). 40+ tests, playground. Commit e06ad3a. Iter 403 VAR was phantom; this is the real push.

### Iter 404 — 2026-07-11 — [Run §29144500148](https://github.com/githubnext/tsb/actions/runs/29144500148)
⚠️ Phantom: Prophet-style state updated to 192 but push failed. Branch stayed at 191.

### Iters 398–403 — ⚠️ Phantom (GARCH+SARIMA+VAR never pushed; metric stayed 191)
### Iters 1–397 — (0→191): Core (Index, Series, DataFrame, Dtype), stats (ACF/PACF, ARIMA, Kalman, ETS, signal, filters, etc.), io (CSV, JSON, Excel, Parquet, HDF5, Feather, Avro, ORC, SAS, Stata, FWF, XML, SQL) and more.
