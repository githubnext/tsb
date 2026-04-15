# Evergreen: PR #97

## State

| Field | Value |
|:---|:---|
| head_sha | c568cae7ece9b85b2adcd45f3c7fc69f7cbfacee |
| attempts | 1 |
| last_run | 2026-04-15T22:47:00Z |
| last_result | failure |

## Notes

Merge conflicts were resolved locally at commit c568cae7ece9b85b2adcd45f3c7fc69f7cbfacee.
However, the commit could not be pushed because the `push_to_pull_request_branch`
safeoutputs tool consistently returns:
> Branch autoloop/build-tsb-pandas-typescript-migration-386494629e84e653 does not exist locally.
Cannot generate incremental patch.

This appears to be the same issue as PR #58 where the push mechanism doesn't work.

Conflicts resolved:
- src/index.ts: kept PR's pct_change exports + main's new additions
- src/stats/index.ts: kept PR's pct_change exports + main's new additions
- playground/index.html: kept both pct_change card (from PR) and insert_pop card (from main)
