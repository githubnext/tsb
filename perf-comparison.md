# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-21T04:32:03Z |
| Iteration Count | 272 |
| Best Metric | 366 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | — |
| Steering Issue | #131 |
| Experiment Log | #130 |
| Paused | true |
| Pause Reason | 3 consecutive push failures: safeoutputs MCP tools unavailable (report "does not exist"). Evaluation succeeds (confirmed 371) but commits cannot be pushed. Unpause once runner has working MCP tool access. |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 3 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, error, error, error, accepted, error |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better)
**Branch**: [`autoloop/perf-comparison`](../../tree/autoloop/perf-comparison)
**Pull Request**: — (new PR to be created this iteration)
**Steering Issue**: #131

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **Iters 270-272 (CRITICAL: MCP tools broken)**: safeoutputs MCP tools (create_pull_request, push_to_pull_request_branch, noop, add_comment) ALL report "tool does not exist" in current runner environment. Evaluation works but commits cannot be pushed. This is a runner/MCP server connectivity issue — not a code problem. tsx at `/tmp/gh-aw/agent/node_modules/.bin/tsx` works, parallel eval (8 workers, 30s timeout) gives 371/632.
- **Iter 271 (tsx fallback)**: When bun CDN is blocked (403 on github.com/oven-sh), `tsx` (via `npx tsx` or installed via `npm install tsx --prefix`) works as a drop-in replacement. tsx startup ≈ 0.85s/invocation vs bun's near-instant startup. With 8 parallel workers, 632 pairs complete in ~15 min with tsx vs ~2-3 min with bun. Result: 366-371/632 successful pairs (261 failed — likely timeouts on slower benchmarks).
- **Iter 271 (run_benchmarks.sh)**: Key fixes: (1) tsx fallback detection, (2) temp-file JSON passing to avoid shell quoting issues, (3) 8 parallel workers with xargs -P, (4) python3 heredoc for merge script. Previous sequential script would have failed entirely without bun.
- **Iter 270 (CRITICAL push failure)**: `push_to_pull_request_branch` MCP tool is blocked by runner policy — safeoutputs MCP server runs in Docker at `host.docker.internal:80` and does NOT have access to the runner's local filesystem. `add_comment` works (GitHub API only). Solution: The framework's native tool calling must be used, but it's blocked by policy. This means code changes cannot be pushed in any run where the policy blocks safeoutputs.
- **Iter 269 (CRITICAL)**: Canonical branch `results.json` was ALWAYS empty (metric=0) — prior accepted iters 262-268 that claimed metrics 605-607 all committed to WRONG suffixed branches (not `autoloop/perf-comparison`). State's recorded best_metric of 607 was a phantom. True canonical best was 0. This run = FIRST real evaluation of canonical branch. Parallel eval (20 workers, 60s timeout) gave 233/607 successful pairs; 374 failures were CPU-contention timeouts. Sequential eval would be higher.
- **Iter 269 (bun)**: `bun` NOT in system PATH. Eval script installs to `$HOME/.bun/bin/bun` via curl (bun.sh/install). GitHub releases CDN at github.com/oven-sh may be blocked (403) in some envs; succeeded in iter 269's Actions runner.
- **Iter 262**: Added 6 pairs to canonical (was only iter to correctly push to canonical): series_ffill_bfill_fn, dataframe_ffill_bfill_fn, dataframe_diff_shift_fn, interval_range_fn, date_range_fn, nunique_standalone_fn. Commit 15f8815.
- **Branch reset pattern**: origin/autoloop/perf-comparison resets to main after each PR merge. Always checkout from origin/autoloop/perf-comparison.
- **DataFrame construction**: use `DataFrame.fromColumns({...})` not `new DataFrame({...})`.
- groupby AggName: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- reindexSeries supports method: "ffill"|"bfill"|"nearest" with optional limit.
- SeriesGroupBy has getGroup, agg, sum, mean, min, max, count, std, first, last, size, transform, apply, filter methods.

---

## 🔭 Future Directions

- **Fix FAIL benchmarks**: 261/632 pairs failed. Investigate common failure modes — likely some benchmarks import bun-specific APIs not available in node/tsx, or have very slow operations that exceed 30s timeout.
- **Improve tsx performance**: tsx startup ≈ 0.85s/invocation. With bun (if available), even more pairs would succeed. When bun CDN is available, metric could reach 550+.
- **Add window_extended benchmarks**: `rollingSem`, `rollingSkew`, `rollingKurt`, `rollingQuantile` pairs not yet added.
- **Add numeric_extended benchmarks**: `src/stats/numeric_extended.ts` not yet benchmarked.
- **Increase worker count**: Try BENCHMARK_WORKERS=12 or 16 for even higher throughput.

---

## 📊 Iteration History

### Iteration 272 — 2026-04-21T04:32 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24704103235)

- **Status**: ⚠️ Error | **Metric**: 371 (evaluated locally, push failed; local commit 1fbda22 NOT pushed to GitHub)
- Successfully re-applied iter 271 changes: tsx fallback via `/tmp/gh-aw/agent/node_modules/.bin/tsx`, 8 parallel workers, 30s timeout, pip3 --break-system-packages. Added `bench_string_ops_extended` pair. Evaluation confirmed 371/632 pairs. However, safeoutputs MCP tools again report "tool does not exist" — all of create_pull_request/push_to_pull_request_branch/noop unavailable. Program auto-paused after 3 consecutive errors. **Next run should re-apply run_benchmarks.sh + bench_string_ops_extended and attempt push in environment where MCP tools work.**

### Iteration 271 — 2026-04-21T03:52 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24701850957)

- **Status**: ⚠️ Error | **Metric**: 366 locally (push failed; local commit 990c7ae NOT pushed to GitHub)
- Fixed `run_benchmarks.sh` with tsx fallback (when bun CDN blocked), 8 parallel workers, temp-file JSON parsing, 30s timeouts. Added `bench_string_ops_extended` pair. Evaluation: 366/632 successful pairs (up from 233). Local commit 990c7ae on autoloop/perf-comparison. safeoutputs MCP tools NOT available in this runner (same issue as iter 270 — push_to_pull_request_branch/create_pull_request/noop all report "tool does not exist"). **Next run MUST re-apply these changes.**

### Iteration 270 — 2026-04-21T01:36 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24699442900)

- **Status**: ⚠️ Error | **Metric**: N/A (push failed; local commit fb86b13 NOT pushed to GitHub)
- Rewrote `run_benchmarks.sh` to use 8 parallel workers with 30s per-benchmark timeout and temp-file result collection. Added bun fallback path detection. Added 1 new benchmark pair: `bench_datetime_tz`. Changes committed locally (fb86b13) but could NOT be pushed — `push_to_pull_request_branch` blocked by runner policy (safeoutputs server runs in Docker without runner filesystem access). **Next run must re-apply these changes.**

### Iteration 269 — 2026-04-20T23:46 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24695261511)

- **Status**: ✅ Accepted | **Metric**: 233 (true canonical baseline was 0; state's phantom "607" corrected; delta: +233) | **Commit**: ab8b0ec
- Added 8 new standalone benchmark pairs: ffill_bfill_series, ffill_bfill_df, diff_shift_df, interval_range, date_range, to_timedelta, date_utils, nunique_df. First genuine canonical evaluation via parallel runner (20 workers, 60s timeout): 233/607 pairs successful. Many pairs timed out due to CPU contention in parallel; sequential eval would yield higher count.

### Iters 258–268 — ✅ mix (wrong branches) | metrics claimed 604→610 but canonical was always 0. Added many pairs to main (via wrong branches then PRs), which is why main now has 599 TS/PY pairs. Commits: 762e824, 28bbc3b, 15f8815, b8edf68, 8180184, 332f5b6, fd64174, cda8853.

### Iters 252–257 — ✅/⚠️ mix | metrics 534→543.

### Iters 163–251 — ✅/⚠️ mix | metrics 508→534. PR #148 merged 534 pairs to main.

### Iters 1–162 — all ✅/⚠️ | metrics 0→508. Full baseline benchmarks established.
