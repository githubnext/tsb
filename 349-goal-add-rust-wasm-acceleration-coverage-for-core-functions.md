# Goal #349: [Goal] Add Rust/WASM acceleration coverage for core functions

This file is maintained by the Goal workflow. Maintainers may edit guidance sections directly.

## Machine State

| Field | Value |
|-------|-------|
| Issue | #349 |
| Branch | `goal/349-goal-add-rust-wasm-acceleration-coverage-for-core-functions` |
| PR | (pending - Run 3) |
| Status | active |
| Last Run | 2026-07-02T07:41:49Z |
| Run Count | 3 |
| Completed | false |
| Completed Reason | - |
| Blocked | false |
| Blocked Reason | - |

## Current Checkpoint

- Run 3: Added 22 missing core exports to wasm-coverage.json (Flags, getFlags, nullable arrays, SparseArray/SparseDtype, options, api/apiTypes, pdArray/PandasArray). Updated wasm-coverage-check.ts to validate manifest against live export surface. Manifest now has 143 entries (6 rust-wasm, 137 ts-only-ineligible, 0 missing). Coverage check passes with tsx.

## Human Guidance

- Read new non-bot issue comments before every run.
- Issue was updated 2026-07-02 with a new, more stringent completion contract that explicitly says the previous 121-entry manifest (Run 2) was not sufficient.
- Scheduler has a persistent detection false positive for this issue's completion_contract section (also happened in Run 1). Issue HAS a completion contract; scheduler cannot detect it.
- PR #356 was created by mrjf manually and merged 2026-06-27.

## Evidence Log

- Run 2: `bun run wasm:test` — 35/35 parity tests pass
- Run 2: `bun run lint` — 0 errors
- Run 2: `bun run typecheck` — passes
- Run 2: `bun run wasm:coverage` — PASS: 121 entries (6 rust-wasm, 115 ts-only-ineligible, 0 unclassified, 0 eligible_missing) — but this was BEFORE the 2026-07-02 contract update
- Run 2: `bun run bench:wasm-core` — PASS: 8 benchmarks, results-wasm-core.json written
- Run 3: wasm-coverage.json updated to 143 entries (22 missing entries added)
- Run 3: `npx tsx scripts/wasm-coverage-check.ts` — PASS: 143 total, 6 rust-wasm, 137 ts-only-ineligible, 0 unclassified, 0 eligible_missing, 0 missing from manifest
- Run 3: Export audit: 132 core/index exports + 133 top-level core re-exports = 143 unique, all covered

## Remaining Work

- Bun + WASM toolchain not available in current environment (network restrictions prevent install)
- Cannot run full evidence script (requires bun + wasm-pack)
- Cannot run wasm:build, wasm:test, wasm:coverage, bench:wasm-core via bun
- Next run should verify: bun run wasm:coverage passes after manifest update
- Completion contract may still require method inventory for class exports

## Run History

- Run 1 (2026-06-26T22:55:18Z): `needs_action` — scheduler flagged missing sections. Posted clarification comment.
- Run 2 (2026-06-27): `active` — Full implementation: Rust crate, WASM build, TS layer, coverage manifest, 35 parity tests, benchmarks. All verification passes. PR #356 merged by mrjf.
- Run 3 (2026-07-02): `active` — Added 22 missing manifest entries (Flags, getFlags, nullable arrays, SparseArray/SparseDtype, options, api, apiTypes, pdArray, PandasArray). Updated coverage check script to validate against live export surface. 143 total entries, all covered.
