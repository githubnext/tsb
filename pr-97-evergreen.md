# Evergreen: PR #97

## State

| Field | Value |
|:---|:---|
| head_sha | c3c63273e424daf7dccae90ce768818ddbab2b54 |
| attempts | 2 |
| last_run | 2026-04-15T10:15:00Z |
| last_result | failure |

## Notes

Merge conflicts resolved twice (commits e6e7a3e and 88fdf8a) but push consistently
fails. Current run: safeoutputs MCP server blocked by policy (`--disable-builtin-mcps`).
No git credentials available (GITHUB_TOKEN unset). Conflict resolution is correct:
pct_change exports preserved in src/stats/index.ts, src/index.ts, playground/index.html.
