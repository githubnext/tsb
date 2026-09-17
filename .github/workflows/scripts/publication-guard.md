# Deterministic publication guard

Goal and Autoloop propose work; a read-only host job decides whether its state
transitions may be published. It does not gate PR merging or give the agent
additional credentials.

The guard reads the actual remote memory branch, overlays the proposed Markdown
files as gh-aw does, and binds every changed file/output target to the separately
uploaded, pre-inference host selection. It rejects unpausing, completion resets,
untyped pending clearance and ambiguous state. Ordinary pending, blocked and
typed rejected updates remain possible.

Score changes, accepted iterations, new verified evidence and completion require
an approved criterion/evaluator entry from the immutable trusted checkout.
**No approvals are installed by default.** This is groundwork for explicitly
reviewed checkpoints, not a new semantic evaluator or fully autonomous scoring.

An optional `--policy` JSON file has this exact-checkpoint shape:

```json
{
  "schema_version": 1,
  "approvals": [{
    "workflow": "goal",
    "state_path": "123-example.md",
    "issue": 123,
    "pr": 456,
    "branch": "goal/123-example",
    "base": "main",
    "head_sha": "<full reviewed commit SHA>",
    "tree_sha": "<full reviewed tree SHA>",
    "criterion": "<maintainer-approved contract identity>",
    "evaluator": "<maintainer-approved evaluator identity>",
    "allow_completion": true
  }]
}
```

For an Autoloop score/acceptance, `metric` must additionally equal the exact
proposed `Best Metric` string. There must be one matching policy entry. No
candidate-owned evaluator or source file is executed on the host.

Even with approval, the guard independently reads the exact open canonical PR,
commit tree, current CI attempt, complete native-check rollup and current review
states. A missing/failed check, active changes-requested review, malformed API
response or observed identity change fails closed. A nonterminal checkpoint
approval cannot close an issue or remove its scheduling label.

Run the helper with `--repository`, `--workflow`, `--proposal`, `--safeoutputs`,
`--selection`, `--branch-state`, `--steering` and `--report`; policy is optional. The helper
emits `allowed=true/false` through `GITHUB_OUTPUT`, writes a token-free report,
and exits nonzero on denial. Only its API step receives the existing read token.
Fresh issue/PR metadata is compared with startup steering before publication;
changes invalidate the run. This is not full post-startup comment-body equivalence.

The supported graph is agent → publication guard → detection → both publishers.
The detection pre-step must **fail**, not skip, when approval is absent because
the pinned memory publisher permits skipped detection. Tests assert this wiring.

Comments are not semantic evidence and are not language-classified. The report
binds the observed baseline and proposal digests, but is **not atomic CAS**:
gh-aw may retry a concurrent memory push. Workflow serialization prevents normal
same-workflow overlap; out-of-band maintainers remain a documented race boundary.
