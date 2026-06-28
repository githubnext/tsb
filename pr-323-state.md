# Evergreen: PR #323

## State

| Field | Value |
|:---|:---|
| head_sha | 0468302 (push declared) |
| attempts | 1 |
| last_run | 2026-06-28T01:52:00Z |
| last_result | repair pushed |

## Last Repair

Fixed 20 failing tests in `tests/stats/information.test.ts` introduced by Autoloop Iteration 383 (information theory module).

Three failure classes:
1. **Precision mismatch** (14 failures): `r()` helper rounds to 6dp but assertions used `toBeCloseTo(x, 8)` (requires < 5e-9 diff). Fixed by removing `r()` wrappers from precision-8 assertions.
2. **fc.float 32-bit constraint** (5 failures): `1e-4` and `0.01` are not representable as 32-bit floats; fast-check throws. Fixed by wrapping with `Math.fround()`.
3. **Symmetric KL test bug** (1 failure): `p=[0.2,0.8]` vs `q=[0.8,0.2]` gives equal KL divergence (special symmetric case). Changed to `p=[0.1,0.9]` vs `q=[0.4,0.6]`.
