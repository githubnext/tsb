import assert from "node:assert/strict";
import test from "node:test";
import { plan } from "./planner.mjs";

const candidate = {
  repository: "githubnext/tsb",
  number: 42,
  state: "OPEN",
  isDraft: false,
  headSha: "head",
  baseSha: "base",
  policyDigest: "policy",
  approvals: 0,
  unresolvedThreads: 0,
};

const requiredJob = {
  id: "test",
  checkName: "Test",
  source: ".github/workflows/ci.yml#test",
  provides: ["tests"],
  necessity: "required",
  invalidatedBy: ["any-head-change", "workflow-change", "policy-change"],
  prerequisites: [],
  cost: "low",
  automaticRetries: 0,
  diagnose: true,
};

const base = {
  candidate,
  event: { expectedHeadSha: "head", policyDigest: "policy", duplicate: false },
  policy: {
    operationMode: "orchestrate",
    autoMerge: "off",
    mergeMethod: "squash",
    requireNonDraft: true,
    requiredApprovals: 0,
    requireResolvedThreads: false,
    jobs: [requiredJob],
  },
  evidence: { Test: { conclusion: "SUCCESS" } },
  handledExceptionKeys: [],
  policyAmbiguity: false,
  unknownBlockingFailure: false,
};

const cases = [
  ["green candidate", {}, "ready", "all-requirements-satisfied"],
  [
    "stale event",
    { event: { ...base.event, expectedHeadSha: "old" } },
    "noop",
    "stale-event",
  ],
  ["missing evidence", { evidence: {} }, "waiting", "required-check-not-reported"],
  [
    "pending evidence",
    { evidence: { Test: { conclusion: "IN_PROGRESS" } } },
    "waiting",
    "required-check-running",
  ],
  [
    "failed evidence hands off",
    { evidence: { Test: { conclusion: "FAILURE" } } },
    "diagnose",
    "required-check-failed",
  ],
  [
    "unknown failure hands off",
    { unknownBlockingFailure: true },
    "diagnose",
    "unknown-failure",
  ],
  [
    "policy ambiguity hands off",
    { policyAmbiguity: true },
    "diagnose",
    "policy-ambiguity",
  ],
  [
    "duplicate event",
    { event: { ...base.event, duplicate: true } },
    "noop",
    "duplicate-event",
  ],
];

for (const [name, changes, expectedState, expectedReason] of cases) {
  test(name, () => {
    const actual = plan({ ...base, ...changes });
    assert.equal(actual.state, expectedState);
    assert.equal(actual.reason, expectedReason);
  });
}

test("missing cheap work dispatches before expensive work", () => {
  const actual = plan({
    ...base,
    evidence: {},
    policy: {
      ...base.policy,
      jobs: [
        { ...requiredJob, id: "expensive", checkName: "Expensive", cost: "high", dispatch: {} },
        { ...requiredJob, id: "cheap", checkName: "Cheap", cost: "low", dispatch: {} },
      ],
    },
  });
  assert.equal(actual.state, "dispatch");
  assert.equal(actual.effects[0].job, "cheap");
});

test("failed prerequisite prevents downstream dispatch", () => {
  const actual = plan({
    ...base,
    evidence: {
      Prerequisite: { conclusion: "FAILURE" },
    },
    policy: {
      ...base.policy,
      jobs: [
        { ...requiredJob, id: "prerequisite", checkName: "Prerequisite", provides: ["compile"] },
        {
          ...requiredJob,
          id: "downstream",
          checkName: "Downstream",
          prerequisites: ["compile"],
          dispatch: {},
        },
      ],
    },
  });
  assert.equal(actual.state, "diagnose");
  assert.equal(actual.proposedEffects[0].job, "prerequisite");
});

test("retry budget is consumed before diagnosis", () => {
  const actual = plan({
    ...base,
    evidence: { Test: { conclusion: "FAILURE", automaticRetries: 0 } },
    policy: {
      ...base.policy,
      jobs: [{ ...requiredJob, dispatch: {}, automaticRetries: 1 }],
    },
  });
  assert.equal(actual.state, "dispatch");
  assert.equal(actual.reason, "retry-required-check");
});

test("identical exception is handed off once", () => {
  const first = plan({ ...base, evidence: { Test: { conclusion: "FAILURE" } } });
  const second = plan({
    ...base,
    evidence: { Test: { conclusion: "FAILURE" } },
    handledExceptionKeys: [first.proposedEffects[0].key],
  });
  assert.equal(second.state, "noop");
  assert.equal(second.reason, "exception-already-handled");
});

test("observation mode has no effects", () => {
  const actual = plan({
    ...base,
    evidence: { Test: { conclusion: "FAILURE" } },
    policy: { ...base.policy, operationMode: "observe" },
  });
  assert.equal(actual.state, "diagnose");
  assert.equal(actual.effects.length, 0);
  assert.equal(actual.proposedEffects.length, 1);
});

test("declared policy changes invalidate older evidence", () => {
  const actual = plan({
    ...base,
    evidence: {
      Test: { conclusion: "SUCCESS", completedAt: "2026-09-03T10:00:00Z" },
    },
    revisions: {
      policyChangedAt: "2026-09-03T11:00:00Z",
      workflows: { [requiredJob.source]: "2026-09-03T09:00:00Z" },
    },
  });
  assert.equal(actual.state, "waiting");
  assert.equal(actual.reason, "required-check-not-reported");
});

test("undeclared policy changes do not invalidate workflow-bound evidence", () => {
  const actual = plan({
    ...base,
    evidence: {
      Test: { conclusion: "SUCCESS", completedAt: "2026-09-03T10:00:00Z" },
    },
    revisions: {
      policyChangedAt: "2026-09-03T11:00:00Z",
      workflows: { [requiredJob.source]: "2026-09-03T09:00:00Z" },
    },
    policy: {
      ...base.policy,
      jobs: [{ ...requiredJob, invalidatedBy: ["workflow-change"] }],
    },
  });
  assert.equal(actual.state, "ready");
});

test("auto-merge requires readiness and preserves the identity guard", () => {
  const actual = plan({
    ...base,
    policy: { ...base.policy, autoMerge: "on" },
  });
  assert.equal(actual.state, "auto-merge");
  assert.match(actual.effects[0].key, /head:base:policy:auto-merge:squash$/);

  const stale = plan({
    ...base,
    event: { ...base.event, expectedHeadSha: "superseded" },
    policy: { ...base.policy, autoMerge: "on" },
  });
  assert.equal(stale.state, "noop");
  assert.equal(stale.effects.length, 0);
});
