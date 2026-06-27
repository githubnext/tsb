# Evergreen: PR #323

## State

| Field | Value |
|:---|:---|
| head_sha | 6a0e37a (local) / push pending |
| attempts | 2 |
| last_run | 2026-06-27T20:42:29Z |
| last_result | repair pushed |

## Last Repair

Fixed `toXml` tag collision: column names `"- "` and `"_- "` both sanitized to `"_-_"` via `toXmlName`, causing property test failure `round-trip: toXml then readXml preserves shape` (seed=-849925200, counterexample=[["- ","_- "],1]).

Added `resolvedTags` array in `toXml` that resolves sanitization collisions by appending `_1`, `_2`, … suffixes to duplicate XML element names.
