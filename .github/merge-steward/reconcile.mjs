import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";
import { plan, projectPolicy } from "./planner.mjs";

const repo = process.env.GITHUB_REPOSITORY;
const eventName = process.env.GITHUB_EVENT_NAME;
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
const configText = readFileSync(".github/merge-steward.yml", "utf8");
const config = JSON.parse(
  execFileSync(
    "ruby",
    [
      "-ryaml",
      "-rjson",
      "-e",
      "puts JSON.generate(YAML.safe_load(STDIN.read, permitted_classes: [], aliases: false))",
    ],
    { input: configText, encoding: "utf8" },
  ),
);
const policyDigest = createHash("sha256").update(configText).digest("hex");
const policy = projectPolicy(config);

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8" }).trim();
}

function ghJson(args) {
  return JSON.parse(gh(args));
}

function latestTrustedChange(path) {
  return execFileSync("git", ["log", "-1", "--format=%cI", "--", path], {
    encoding: "utf8",
  }).trim();
}

const revisions = {
  policyChangedAt: latestTrustedChange(".github/merge-steward.yml"),
  workflows: Object.fromEntries(
    policy.jobs.map(({ source }) => [source, latestTrustedChange(source.split("#")[0])]),
  ),
};

function pullRequestNumbers() {
  const direct = event.pull_request?.number;
  if (direct) return [direct];
  const review = event.review?.pull_request_url?.split("/").pop();
  if (review) return [Number(review)];
  const workflowPulls = event.workflow_run?.pull_requests ?? [];
  if (workflowPulls.length > 0) return [...new Set(workflowPulls.map(({ number }) => number))];
  const manual = event.inputs?.pull_request_number;
  if (manual) return [Number(manual)];
  if (eventName === "schedule") {
    return ghJson([
      "pr",
      "list",
      "--repo",
      repo,
      "--state",
      "open",
      "--limit",
      "100",
      "--json",
      "number",
    ]).map(({ number }) => number);
  }
  return [];
}

function aggregateEvidence(checks) {
  const evidence = {};
  for (const check of checks ?? []) {
    const name = check.name ?? check.context;
    if (!name) continue;
    const conclusion = String(
      check.conclusion ?? check.state ?? check.status ?? "MISSING",
    ).toUpperCase();
    const completedAt = check.completedAt ?? check.startedAt ?? "";
    const previous = evidence[name];
    if (!previous || completedAt >= previous.completedAt) {
      evidence[name] = { conclusion, completedAt };
    }
  }
  return evidence;
}

function expectedHeadSha(number) {
  if (event.pull_request?.number === number) return event.pull_request.head?.sha;
  if (event.workflow_run?.pull_requests?.some((pull) => pull.number === number)) {
    return event.workflow_run.head_sha;
  }
  return event.inputs?.expected_head_sha || undefined;
}

function loadCandidate(number) {
  const pull = ghJson([
    "pr",
    "view",
    String(number),
    "--repo",
    repo,
    "--json",
    "number,state,isDraft,headRefOid,baseRefOid,reviews,statusCheckRollup",
  ]);
  const approvals = new Set(
    (pull.reviews ?? [])
      .filter(({ state }) => state === "APPROVED")
      .map(({ author }) => author?.login)
      .filter(Boolean),
  ).size;
  return {
    candidate: {
      repository: repo,
      number: pull.number,
      state: pull.state,
      isDraft: pull.isDraft,
      headSha: pull.headRefOid,
      baseSha: pull.baseRefOid,
      policyDigest,
      approvals,
      unresolvedThreads: 0,
    },
    evidence: aggregateEvidence(pull.statusCheckRollup),
  };
}

function reconcile(number) {
  const loaded = loadCandidate(number);
  return plan({
    ...loaded,
    event: {
      expectedHeadSha: expectedHeadSha(number),
      policyDigest,
      duplicate: false,
    },
    policy,
    revisions,
    handledExceptionKeys: [],
    policyAmbiguity: false,
    unknownBlockingFailure: false,
  });
}

const plans = pullRequestNumbers().map((number) => reconcile(number));
const summary = [
  "# Merge Steward observation",
  "",
  `Policy digest: \`${policyDigest}\``,
  "",
  "| PR | Head | State | Reason | Proposed effects |",
  "|---:|---|---|---|---|",
  ...plans.map((item) => {
    const effects = item.proposedEffects.map(({ type, reason }) =>
      reason ? `${type}:${reason}` : type,
    );
    return `| #${item.candidate.number} | \`${item.candidate.headSha.slice(0, 12)}\` | ${item.state} | ${item.reason} | ${effects.join(", ") || "none"} |`;
  }),
];
if (plans.length === 0) summary.push("| - | - | noop | no-pull-request | none |");
appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary.join("\n")}\n`);
console.log(JSON.stringify(plans, null, 2));
