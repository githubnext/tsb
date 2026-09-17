import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { plan } from "./planner.mjs";
import {
  changesAutomation,
  diagnosisIsFirst,
  diagnosisRuns,
  digest,
  exceptionTitle,
  executePlan,
  pages,
  policyInventory,
  resolvePullRequests,
  sameIdentity,
} from "./reconcile.mjs";

for (const filename of [
  ".github/workflows/new-ci.yml",
  ".github/workflows/diagnose.md",
  ".github/workflows/diagnose.lock.yml",
  ".github/actions/helper/action.yml",
  ".github/aw/shared.md",
  ".github/merge-steward/planner.mjs",
  ".github/merge-steward.yml",
  ".github/merge-steward.schema.json",
]) {
  test(`automation changes include newly added or changed ${filename}`, () => {
    assert.equal(changesAutomation([{ filename }]), true);
  });
}

test("renaming a sensitive automation file away still requires review", () => {
  assert.equal(
    changesAutomation([
      { filename: "docs/old-ci.yml", previous_filename: ".github/workflows/ci.yml" },
    ]),
    true,
  );
});

test("renaming a regular file into an automation path requires review", () => {
  assert.equal(
    changesAutomation([
      { filename: ".github/actions/new/action.yml", previous_filename: "docs/example.yml" },
    ]),
    true,
  );
});

test("ordinary source and documentation changes do not become automation changes", () => {
  assert.equal(
    changesAutomation([
      { filename: "src/core/dataframe.ts" },
      { filename: ".github/merge-steward.md" },
      { filename: ".github/workflows-not-active/ci.yml" },
      { filename: ".github/merge-steward.yml.backup" },
      { filename: "docs/new.md", previous_filename: "docs/old.md" },
    ]),
    false,
  );
  assert.equal(changesAutomation([]), false);
});

test("a sensitive change cannot hide among ordinary files", () => {
  assert.equal(
    changesAutomation([
      { filename: "src/index.ts" },
      { filename: ".github/merge-steward/reconcile.mjs" },
      { filename: "docs/guide.md" },
    ]),
    true,
  );
});

const repository = "githubnext/tsb";
const candidate = {
  repository,
  number: 42,
  headSha: "head",
  baseSha: "base",
  policyDigest: "policy",
  state: "OPEN",
  isDraft: false,
  labels: [],
  approvals: 0,
  unresolvedThreads: 0,
  autoMergeRequest: null,
  mergeable: true,
  nativeRequirementsSatisfied: true,
};
const source = ".github/workflows/ci.yml#test";
const job = {
  id: "test",
  checkName: "Test",
  source,
  necessity: "required",
  freshnessSubject: "every-head",
  invalidatedBy: ["any-head-change", "workflow-change", "policy-change"],
  phase: "on-change",
  approvalMode: "never",
  automaticRetries: 0,
  diagnose: true,
};
const policy = {
  operationMode: "orchestrate",
  autoMerge: "off",
  mergeMethod: "squash",
  requireNonDraft: true,
  requiredApprovals: 0,
  requireResolvedThreads: false,
  jobs: [job],
};
const success = {
  fresh: true,
  headSha: candidate.headSha,
  source,
  conclusion: "SUCCESS",
  startedAt: "2026-09-03T10:00:00Z",
  completedAt: "2026-09-03T10:01:00Z",
};
function planned(changes = {}) {
  return plan({
    candidate,
    event: {},
    policy,
    evidence: { Test: success },
    handledExceptionKeys: [],
    revisions: {
      policyChangedAt: "2026-09-03T09:00:00Z",
      workflows: { [source]: "2026-09-03T09:00:00Z" },
    },
    ...changes,
  });
}
function diagnostic(changes = {}) {
  return planned({ evidence: { Test: { ...success, conclusion: "FAILURE" } }, ...changes });
}
function adapters(current) {
  const calls = [];
  return {
    calls,
    enabled: true,
    reload: async () => {
      calls.push(["reload"]);
      return current;
    },
    dispatch: async (effect, freshCandidate) => {
      calls.push(["dispatch", effect, freshCandidate]);
    },
  };
}

for (const field of ["repository", "number", "headSha", "baseSha", "policyDigest"]) {
  test(`final identity comparison detects changed ${field}`, () => {
    assert.equal(sameIdentity(candidate, { ...candidate }), true);
    const changed = { ...candidate, [field]: field === "number" ? 43 : `other-${field}` };
    assert.equal(sameIdentity(candidate, changed), false);
  });
}

for (const identity of [
  {},
  undefined,
  null,
  { ...candidate, number: 0 },
  { ...candidate, number: "42" },
  { ...candidate, number: Number.MAX_SAFE_INTEGER + 1 },
  { ...candidate, repository: "" },
  { ...candidate, headSha: " " },
  { ...candidate, baseSha: undefined },
  { ...candidate, policyDigest: null },
]) {
  test(`incomplete or invalid identity never matches itself: ${JSON.stringify(identity)}`, () => {
    assert.equal(sameIdentity(identity, identity), false);
  });
}

test("only candidate identity, rather than irrelevant metadata, is compared", () => {
  assert.equal(sameIdentity(candidate, { ...candidate, title: "a new PR title" }), true);
});

test("invalid candidate identity cannot reach an effect adapter even when repeated", async () => {
  const current = { ...diagnostic(), candidate: {} };
  const io = adapters(current);
  const outcomes = await executePlan({ ...io, planned: current });
  assert.equal(outcomes[0].outcome, "noop");
  assert.deepEqual(io.calls, [["reload"]]);
});

test("green candidate is ready for manual merge and cannot reach an effect adapter", async () => {
  const current = planned();
  const io = adapters(current);
  const outcomes = await executePlan({ ...io, planned: current });
  assert.equal(current.state, "ready");
  assert.deepEqual(io.calls, []);
  assert.deepEqual(outcomes, []);
});

test("diagnosis dispatch receives only the fresh candidate and declared exception", async () => {
  const current = diagnostic();
  const io = adapters(current);
  const outcomes = await executePlan({ ...io, planned: current });
  assert.deepEqual(io.calls, [["reload"], ["dispatch", current.effects[0], current.candidate]]);
  assert.deepEqual(outcomes, [
    { type: "diagnose", outcome: "requested", key: current.effects[0].key },
  ]);
});

for (const field of ["repository", "number", "headSha", "baseSha", "policyDigest"]) {
  test(`final effect guard no-ops when ${field} changes even if an old effect was retained`, async () => {
    const first = diagnostic();
    const changed = { ...candidate, [field]: field === "number" ? 43 : `new-${field}` };
    const io = adapters({ ...first, candidate: changed });
    const outcomes = await executePlan({ ...io, planned: first });
    assert.deepEqual(io.calls, [["reload"]]);
    assert.deepEqual(outcomes, [
      { type: "diagnose", outcome: "noop", reason: "candidate-or-readiness-changed" },
    ]);
  });
}

const changedReadiness = [
  ["draft", { candidate: { ...candidate, isDraft: true } }],
  ["paused", { candidate: { ...candidate, labels: ["mq:pause"] } }],
  ["human review", { candidate: { ...candidate, labels: ["needs-review"] } }],
  ["review withdrawn", { policy: { ...policy, requiredApprovals: 1 } }],
  ["CI recovered", { evidence: { Test: success } }],
  ["failure evidence no longer trusted", { evidence: { Test: { ...success, fresh: false } } }],
  ["new CI run pending", { evidence: { Test: { ...success, conclusion: "IN_PROGRESS" } } }],
  ["new unknown job", { policyAmbiguity: true }],
  ["observation enabled", { policy: { ...policy, operationMode: "observe" } }],
  [
    "diagnosis disabled for the failure",
    { policy: { ...policy, jobs: [{ ...job, diagnose: false }] } },
  ],
  ["event became stale", { event: { expectedHeadSha: "old-head" } }],
];
for (const [name, changes] of changedReadiness) {
  test(`final effect guard no-ops after ${name}`, async () => {
    const first = diagnostic();
    const io = adapters(diagnostic(changes));
    const outcomes = await executePlan({ ...io, planned: first });
    assert.equal(outcomes[0].outcome, "noop");
    assert.deepEqual(io.calls, [["reload"]]);
  });
}

test("diagnosis history added after planning suppresses dispatch", async () => {
  const failure = { evidence: { Test: { ...success, conclusion: "FAILURE" } } };
  const first = planned(failure);
  const duplicate = planned({ ...failure, handledExceptionKeys: [first.effects[0].key] });
  const io = adapters(duplicate);
  assert.equal(duplicate.reason, "exception-already-handled");
  const outcomes = await executePlan({ ...io, planned: first });
  assert.equal(outcomes[0].outcome, "noop");
  assert.deepEqual(io.calls, [["reload"]]);
});

test("a failed check that has recovered does not dispatch stale diagnosis", async () => {
  const first = planned({ evidence: { Test: { ...success, conclusion: "FAILURE" } } });
  const io = adapters(planned());
  const outcomes = await executePlan({ ...io, planned: first });
  assert.equal(outcomes[0].outcome, "noop");
  assert.deepEqual(io.calls, [["reload"]]);
});

for (const changes of [
  { enabled: false },
  { planned: { ...diagnostic(), operationMode: "observe" } },
]) {
  test(`observation or disabled adapter cannot reload or write: ${JSON.stringify(changes)}`, async () => {
    const io = adapters(diagnostic());
    const outcomes = await executePlan({ ...io, planned: diagnostic(), ...changes });
    assert.deepEqual(outcomes, []);
    assert.deepEqual(io.calls, []);
  });
}

test("empty effect plan is a fast no-op", async () => {
  const current = planned({ policy: { ...policy, autoMerge: "off" } });
  const io = adapters(current);
  assert.deepEqual(await executePlan({ ...io, planned: current }), []);
  assert.deepEqual(io.calls, []);
});

for (const effect of [
  { type: "dispatch", key: "uninstalled-worker" },
  { type: "auto-merge", method: "squash", key: "uninstalled-squash-method" },
  { type: "auto-merge", method: "merge", key: "uninstalled-merge-method" },
  { type: "auto-merge", method: "rebase", key: "uninstalled-rebase-method" },
  { type: "auto-merge", key: "uninstalled-unspecified-method" },
  { type: "approve", key: "uninstalled-approval" },
]) {
  test(`effect adapter rejects unreviewed capability ${effect.type}:${effect.method ?? ""}`, async () => {
    const current = { ...planned(), effects: [effect] };
    const io = adapters(current);
    await assert.rejects(
      executePlan({ ...io, planned: current }),
      /Effect adapter is not installed/,
    );
    assert.deepEqual(io.calls, [["reload"]]);
  });
}

test("even a fully ready hypothetical auto-merge plan cannot invoke a mutation", async () => {
  const current = planned({ policy: { ...policy, autoMerge: "on" } });
  assert.equal(current.state, "auto-merge");
  const io = adapters(current);
  await assert.rejects(
    executePlan({ ...io, planned: current }),
    /Effect adapter is not installed: auto-merge/,
  );
  assert.deepEqual(io.calls, [["reload"]]);
});

test("each effect must survive a fresh read, including after an earlier effect", async () => {
  const first = diagnostic();
  const diagnosis = planned({ policyAmbiguity: true });
  const many = { ...first, effects: [first.effects[0], diagnosis.effects[0]] };
  const calls = [];
  let reads = 0;
  const outcomes = await executePlan({
    planned: many,
    enabled: true,
    reload: async () => {
      calls.push("reload");
      return reads++ === 0 ? many : { ...many, effects: [] };
    },
    dispatch: async () => {
      calls.push("dispatch");
    },
  });
  assert.deepEqual(calls, ["reload", "dispatch", "reload"]);
  assert.deepEqual(
    outcomes.map((item) => item.outcome),
    ["requested", "noop"],
  );
});

test("adapter failures propagate without reporting a successful write", async () => {
  const current = diagnostic();
  const io = adapters(current);
  await assert.rejects(
    executePlan({
      ...io,
      planned: current,
      dispatch: async () => {
        throw new Error("GitHub rejected dispatch");
      },
    }),
    /GitHub rejected dispatch/,
  );
});

test("same effect type with a changed key is not authorized", async () => {
  const first = diagnostic();
  const io = adapters({ ...first, effects: [{ ...first.effects[0], key: "different-key" }] });
  const outcomes = await executePlan({ ...io, planned: first });
  assert.equal(outcomes[0].outcome, "noop");
  assert.deepEqual(io.calls, [["reload"]]);
});

function resolver(changes = {}) {
  return {
    repository,
    defaultBranch: "main",
    event: {},
    eventName: "pull_request_target",
    api: async () => {
      throw new Error("Unexpected API read");
    },
    ...changes,
  };
}

test("direct PR events retain their expected head for stale-event rejection", async () => {
  const event = { pull_request: { number: 42, head: { sha: "old-head" } } };
  assert.deepEqual(await resolvePullRequests(resolver({ event })), [
    { number: 42, head: "old-head" },
  ]);
});

test("manual targeted run carries optional expected head", async () => {
  for (const expected of [undefined, "head"]) {
    const event = { inputs: { pull_request_number: "42", expected_head_sha: expected } };
    assert.deepEqual(
      await resolvePullRequests(resolver({ event, eventName: "workflow_dispatch" })),
      [{ number: 42, head: expected ?? "" }],
    );
  }
});

for (const number of ["0", "-1", "42oops", "1.2", "1e4", " 42", "42\n", "01"]) {
  test(`malformed manual PR number ${JSON.stringify(number)} is rejected`, async () => {
    await assert.rejects(
      resolvePullRequests(resolver({ event: { inputs: { pull_request_number: number } } })),
      /Invalid pull request number/,
    );
  });
}

test("CI completion with explicit PR associations needs no broad lookup", async () => {
  const event = {
    workflow_run: {
      name: "CI",
      repository: { full_name: repository },
      pull_requests: [
        { number: 42, head: { sha: "head" } },
        { number: 43, head: { sha: "second" } },
      ],
    },
  };
  assert.deepEqual(await resolvePullRequests(resolver({ eventName: "workflow_run", event })), [
    { number: 42, head: "head" },
    { number: 43, head: "second" },
  ]);
});

for (const workflow_run of [
  undefined,
  { name: "Unrelated", repository: { full_name: repository } },
  { name: "CI", repository: { full_name: "someone/tsb" } },
  { name: "CI" },
]) {
  test(`unrelated or unknown workflow run does not activate: ${JSON.stringify(workflow_run)}`, async () => {
    assert.deepEqual(
      await resolvePullRequests(resolver({ eventName: "workflow_run", event: { workflow_run } })),
      [],
    );
  });
}

for (const eventKind of ["pull_request", "push"]) {
  test(`CI ${eventKind} completion with empty associations matches fork head or merge candidate`, async () => {
    const calls = [];
    const event = {
      workflow_run: {
        name: "CI",
        event: eventKind,
        repository: { full_name: repository },
        head_repository: { full_name: "contributor/tsb" },
        pull_requests: [],
        head_sha: "run-sha",
      },
    };
    const api = async (route) => {
      calls.push(route);
      return [
        { number: 42, head: { sha: "run-sha" }, merge_commit_sha: "other" },
        { number: 43, head: { sha: "fork-head" }, merge_commit_sha: "run-sha" },
        { number: 44, head: { sha: "unrelated" }, merge_commit_sha: "also-unrelated" },
      ];
    };
    assert.deepEqual(
      await resolvePullRequests(resolver({ api, eventName: "workflow_run", event })),
      [
        { number: 42, head: "run-sha" },
        { number: 43, head: "fork-head" },
      ],
    );
    assert.deepEqual(calls, [`repos/${repository}/pulls?state=open&base=main&per_page=100&page=1`]);
  });
}

for (const eventName of ["schedule", "workflow_dispatch"]) {
  test(`${eventName} recovery resolves current open PRs on the configured base`, async () => {
    const calls = [];
    const api = async (route) => {
      calls.push(route);
      return [{ number: 42, head: { sha: "head" } }];
    };
    assert.deepEqual(
      await resolvePullRequests(resolver({ api, eventName, defaultBranch: "release/test" })),
      [{ number: 42, head: "head" }],
    );
    assert.deepEqual(calls, [
      `repos/${repository}/pulls?state=open&base=release%2Ftest&per_page=100&page=1`,
    ]);
  });
}

test("unrelated events are deterministic no-ops", async () => {
  assert.deepEqual(await resolvePullRequests(resolver({ eventName: "push" })), []);
});

test("pagination follows every full page and preserves existing query arguments", async () => {
  const full = Array.from({ length: 100 }, (_, id) => ({ id }));
  const calls = [];
  const api = async (route) => {
    calls.push(route);
    return calls.length === 1 ? full : [{ id: 100 }];
  };
  const actual = await pages(api, "repos/example/items?state=open");
  assert.equal(actual.length, 101);
  assert.deepEqual(calls, [
    "repos/example/items?state=open&per_page=100&page=1",
    "repos/example/items?state=open&per_page=100&page=2",
  ]);
});

test("pagination extracts named arrays and terminates on an empty page", async () => {
  const calls = [];
  const api = async (route) => {
    calls.push(route);
    return { workflow_runs: [] };
  };
  assert.deepEqual(await pages(api, "repos/example/runs", "workflow_runs"), []);
  assert.deepEqual(calls, ["repos/example/runs?per_page=100&page=1"]);
});

for (const value of [{}, { workflow_runs: "not-an-array" }]) {
  test(`malformed pagination data fails closed: ${JSON.stringify(value)}`, async () => {
    await assert.rejects(
      pages(async () => value, "repos/example/runs", "workflow_runs"),
      /Invalid paginated response/,
    );
  });
}

test("pagination never silently truncates an unexpectedly large collection", async () => {
  let calls = 0;
  await assert.rejects(
    pages(async () => {
      calls++;
      return Array(100).fill({});
    }, "repos/example/runs"),
    /Pagination limit reached/,
  );
  assert.equal(calls, 100);
});

test("diagnosis history is scoped to the installed explicit-dispatch workflow", async () => {
  const calls = [];
  const actual = await diagnosisRuns(async (route) => {
    calls.push(route);
    return { workflow_runs: [{ id: 7 }] };
  }, repository);
  assert.deepEqual(actual, [{ id: 7 }]);
  assert.deepEqual(calls, [
    `repos/${repository}/actions/workflows/merge-steward-diagnose.lock.yml/runs?event=workflow_dispatch&per_page=100&page=1`,
  ]);
});

test("diagnosis title is a stable digest of the complete exception key", () => {
  assert.equal(digest("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal(
    exceptionTitle("abc"),
    "Merge Steward Diagnosis / ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  assert.notEqual(
    exceptionTitle("head:base:policy:failure"),
    exceptionTitle("new-head:base:policy:failure"),
  );
});

const key = "githubnext/tsb:42:head:base:policy:diagnose:failure-exhausted";
const title = exceptionTitle(key);
for (const [name, runs, runId, expected] of [
  ["first invocation", [{ id: 100, display_title: title }], 100, true],
  ["string invocation ID", [{ id: 100, display_title: title }], "100", true],
  [
    "duplicate later invocation",
    [
      { id: 100, display_title: title },
      { id: 101, display_title: title },
    ],
    101,
    false,
  ],
  [
    "first despite out-of-order history",
    [
      { id: 101, display_title: title },
      { id: 100, display_title: title },
    ],
    100,
    true,
  ],
  ["missing invocation", [{ id: 100, display_title: title }], 101, false],
  [
    "other exception",
    [
      { id: 1, display_title: exceptionTitle("unrelated") },
      { id: 100, display_title: title },
    ],
    100,
    true,
  ],
  ["empty history", [], 100, false],
  ["undefined run ID", [{ id: 100, display_title: title }], undefined, false],
]) {
  test(`diagnosis preflight dedupe: ${name}`, () => {
    assert.equal(diagnosisIsFirst(runs, key, runId), expected);
  });
}

test("inventory finds every unclassified ordinary job and agentic helper", () => {
  const config = {
    jobs: {
      test: { source: ".github/workflows/ci.yml#test" },
      diagnostic: { source: ".github/workflows/diagnose.md#agent" },
    },
  };
  const workflows = {
    ".github/workflows/ci.yml": { jobs: { test: {}, added: {} } },
    ".github/workflows/diagnose.md": { jobs: { preflight: {} } },
    ".github/workflows/new-agent.md": {},
    ".github/workflows/empty.yml": {},
  };
  assert.deepEqual(policyInventory(config, workflows), [
    ".github/workflows/ci.yml#added",
    ".github/workflows/diagnose.md#preflight",
    ".github/workflows/new-agent.md#agent",
  ]);
});

test("fully classified inventory is a no-op without inventing generated jobs", () => {
  const config = {
    jobs: {
      test: { source: ".github/workflows/ci.yml#test" },
      helper: { source: ".github/workflows/diagnose.md#preflight" },
      agent: { source: ".github/workflows/diagnose.md#agent" },
    },
  };
  assert.deepEqual(
    policyInventory(config, {
      ".github/workflows/ci.yml": { jobs: { test: {} } },
      ".github/workflows/diagnose.md": { jobs: { preflight: {} } },
    }),
    [],
  );
});

let repositoryInventory;
function actualRepositoryInventory() {
  if (repositoryInventory) return repositoryInventory;
  const root = new URL("../../", import.meta.url);
  const workflowPaths = readdirSync(new URL(".github/workflows/", root))
    .filter((name) => /\.(yml|yaml|md)$/.test(name) && !name.endsWith(".lock.yml"))
    .sort()
    .map((name) => `.github/workflows/${name}`);
  const policyPath = ".github/merge-steward.yml";
  const lockPaths = ["autoloop", "goal"].map((name) => `.github/workflows/${name}.lock.yml`);
  const texts = Object.fromEntries(
    [policyPath, ...workflowPaths, ...lockPaths].map((path) => {
      const contents = readFileSync(new URL(path, root), "utf8");
      return [path, path.endsWith(".md") ? contents.split(/^---\s*$/m)[1] : contents];
    }),
  );
  // Match the reconciler's safe YAML parser; no Bun or installed repo packages needed.
  const definitions = JSON.parse(
    execFileSync(
      "ruby",
      [
        "-ryaml",
        "-rjson",
        "-e",
        "puts JSON.generate(JSON.parse(STDIN.read).transform_values { |text| YAML.safe_load(text, permitted_classes: [], aliases: false) })",
      ],
      { input: JSON.stringify(texts), encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    ),
  );
  repositoryInventory = {
    config: definitions[policyPath],
    workflows: Object.fromEntries(workflowPaths.map((path) => [path, definitions[path]])),
    compiled: Object.fromEntries(lockPaths.map((path) => [path, definitions[path]])),
  };
  return repositoryInventory;
}

test("actual repository workflow inventory has no unclassified source jobs", () => {
  const { config, workflows } = actualRepositoryInventory();
  assert.deepEqual(policyInventory(config, workflows), []);
});

for (const workflow of ["autoloop", "goal"]) {
  test(`actual ${workflow} safe_outputs still requires an explicit policy classification`, () => {
    const { config, workflows } = actualRepositoryInventory();
    const source = `.github/workflows/${workflow}.md#safe_outputs`;
    assert.ok(workflows[`.github/workflows/${workflow}.md`].jobs.safe_outputs);
    const jobs = Object.fromEntries(
      Object.entries(config.jobs).filter(([, job]) => job.source !== source),
    );
    assert.deepEqual(policyInventory({ ...config, jobs }, workflows), [source]);
  });

  test(`actual ${workflow} publisher classification matches its compiled authority`, () => {
    const { config, compiled } = actualRepositoryInventory();
    const entry = config.jobs[`${workflow}-safe-outputs`];
    const definition = compiled[`.github/workflows/${workflow}.lock.yml`];
    const publisher = definition.jobs.safe_outputs;
    assert.equal(entry.necessity.level, "advisory");
    assert.equal(entry.risk.executes_pr_code, false);
    assert.equal(entry.cost.tier, "low");
    assert.equal(entry.cost.runner, publisher["runs-on"]);
    assert.equal(entry.dispatch, undefined);
    assert.deepEqual(
      [...entry.risk.permissions].sort(),
      Object.entries(publisher.permissions)
        .map(([scope, level]) => `${scope}:${level}`)
        .sort(),
    );
    const secretNames = new Set(
      [...JSON.stringify({ env: definition.env, publisher }).matchAll(/secrets\.([A-Z0-9_]+)/g)]
        .map((match) => match[1])
        .filter((name) => name !== "GITHUB_TOKEN"),
    );
    assert.deepEqual([...entry.risk.secrets].sort(), [...secretNames].sort());
    assert.match(publisher.if, /needs\.agent\.result == 'success'/);
    assert.match(publisher.if, /needs\.detection\.result == 'success'/);
  });
}
