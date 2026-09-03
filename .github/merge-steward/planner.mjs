const COST_ORDER = new Map([
  ["low", 0],
  ["medium", 1],
  ["high", 2],
  ["scarce", 3],
]);

const SUCCESS = new Set(["SUCCESS", "NEUTRAL", "SKIPPED"]);
const PENDING = new Set(["EXPECTED", "PENDING", "QUEUED", "IN_PROGRESS", "WAITING"]);
const FAILURE = new Set(["ACTION_REQUIRED", "CANCELLED", "ERROR", "FAILURE", "STALE", "TIMED_OUT"]);

function effectKey(candidate, type, subject) {
  return [
    candidate.repository,
    candidate.number,
    candidate.headSha,
    candidate.baseSha,
    candidate.policyDigest,
    type,
    subject,
  ].join(":");
}

function result(state, reason, candidate, proposedEffects = [], details = {}) {
  const effects = details.operationMode === "orchestrate" ? proposedEffects : [];
  return {
    state,
    reason,
    candidate,
    effects,
    proposedEffects,
    ...details,
  };
}

function normalizeConclusion(conclusion) {
  return String(conclusion ?? "MISSING").toUpperCase();
}

function completedAfter(completedAt, changedAt) {
  if (!changedAt) return true;
  if (!completedAt) return false;
  return Date.parse(completedAt) >= Date.parse(changedAt);
}

function evidenceIsFresh(job, evidence, revisions) {
  if (!revisions) return true;
  if (
    job.invalidatedBy.includes("policy-change") &&
    !completedAfter(evidence?.completedAt, revisions.policyChangedAt)
  ) {
    return false;
  }
  if (
    job.invalidatedBy.includes("workflow-change") &&
    !completedAfter(evidence?.completedAt, revisions.workflows[job.source])
  ) {
    return false;
  }
  return true;
}

function prerequisitesSatisfied(job, successfulClaims) {
  return (job.prerequisites ?? []).every((claim) => successfulClaims.has(claim));
}

function requiredJobs(policy) {
  return policy.jobs.filter((job) => job.necessity === "required");
}

export function plan(input) {
  const { candidate, event, policy } = input;
  const common = { operationMode: policy.operationMode };

  if (event.expectedHeadSha && event.expectedHeadSha !== candidate.headSha) {
    return result("noop", "stale-event", candidate, [], common);
  }
  if (event.policyDigest && event.policyDigest !== candidate.policyDigest) {
    return result("noop", "stale-policy", candidate, [], common);
  }
  if (event.duplicate) {
    return result("noop", "duplicate-event", candidate, [], common);
  }
  if (candidate.state !== "OPEN") {
    return result("noop", "pull-request-not-open", candidate, [], common);
  }
  if (policy.requireNonDraft && candidate.isDraft) {
    return result("waiting", "draft-pull-request", candidate, [], common);
  }
  if (candidate.approvals < policy.requiredApprovals) {
    return result("waiting", "missing-review-approval", candidate, [], common);
  }
  if (policy.requireResolvedThreads && candidate.unresolvedThreads > 0) {
    return result("waiting", "unresolved-review-thread", candidate, [], common);
  }
  if (input.policyAmbiguity) {
    const key = effectKey(candidate, "diagnose", "policy-ambiguity");
    const proposed = input.handledExceptionKeys.includes(key)
      ? []
      : [{ type: "diagnose", reason: "policy-ambiguity", key }];
    return result(
      proposed.length === 0 ? "noop" : "diagnose",
      proposed.length === 0 ? "exception-already-handled" : "policy-ambiguity",
      candidate,
      proposed,
      common,
    );
  }
  if (input.unknownBlockingFailure) {
    const key = effectKey(candidate, "diagnose", "unknown-failure");
    const proposed = input.handledExceptionKeys.includes(key)
      ? []
      : [{ type: "diagnose", reason: "unknown-failure", key }];
    return result(
      proposed.length === 0 ? "noop" : "diagnose",
      proposed.length === 0 ? "exception-already-handled" : "unknown-failure",
      candidate,
      proposed,
      common,
    );
  }

  const successfulClaims = new Set();
  const missing = [];
  const pending = [];
  const failed = [];

  for (const job of requiredJobs(policy)) {
    const jobEvidence = input.evidence[job.checkName];
    const conclusion = evidenceIsFresh(job, jobEvidence, input.revisions)
      ? normalizeConclusion(jobEvidence?.conclusion)
      : "MISSING";
    if (SUCCESS.has(conclusion)) {
      for (const claim of job.provides) successfulClaims.add(claim);
    } else if (PENDING.has(conclusion)) {
      pending.push(job);
    } else if (FAILURE.has(conclusion)) {
      failed.push(job);
    } else {
      missing.push(job);
    }
  }

  if (failed.length > 0) {
    const job = failed[0];
    const attempts = input.evidence[job.checkName]?.automaticRetries ?? 0;
    if (job.dispatch && attempts < job.automaticRetries) {
      const proposed = [
        {
          type: "dispatch",
          job: job.id,
          key: effectKey(candidate, "dispatch", job.id),
        },
      ];
      return result("dispatch", "retry-required-check", candidate, proposed, {
        ...common,
        failed: failed.map(({ id }) => id),
      });
    }
    if (job.diagnose) {
      const key = effectKey(candidate, "diagnose", "failure-exhausted");
      const proposed = input.handledExceptionKeys.includes(key)
        ? []
        : [{ type: "diagnose", reason: "failure-exhausted", job: job.id, key }];
      return result(
        proposed.length === 0 ? "noop" : "diagnose",
        proposed.length === 0 ? "exception-already-handled" : "required-check-failed",
        candidate,
        proposed,
        { ...common, failed: failed.map(({ id }) => id) },
      );
    }
    return result("attention", "required-check-failed", candidate, [], {
      ...common,
      failed: failed.map(({ id }) => id),
    });
  }

  if (pending.length > 0) {
    return result("waiting", "required-check-running", candidate, [], {
      ...common,
      pending: pending.map(({ id }) => id),
    });
  }

  if (missing.length > 0) {
    const dispatchable = missing
      .filter((job) => job.dispatch && prerequisitesSatisfied(job, successfulClaims))
      .sort((left, right) => COST_ORDER.get(left.cost) - COST_ORDER.get(right.cost));
    if (dispatchable.length > 0) {
      const job = dispatchable[0];
      const proposed = [
        {
          type: "dispatch",
          job: job.id,
          key: effectKey(candidate, "dispatch", job.id),
        },
      ];
      return result("dispatch", "missing-required-check", candidate, proposed, {
        ...common,
        missing: missing.map(({ id }) => id),
      });
    }
    return result("waiting", "required-check-not-reported", candidate, [], {
      ...common,
      missing: missing.map(({ id }) => id),
    });
  }

  if (policy.autoMerge === "on") {
    const proposed = [
      {
        type: "auto-merge",
        method: policy.mergeMethod,
        key: effectKey(candidate, "auto-merge", policy.mergeMethod),
      },
    ];
    return result("auto-merge", "all-requirements-satisfied", candidate, proposed, common);
  }

  return result("ready", "all-requirements-satisfied", candidate, [], common);
}

export function projectPolicy(config) {
  return {
    operationMode: config.defaults.operation_mode ?? "observe",
    autoMerge: config.defaults.auto_merge,
    mergeMethod: config.defaults.merge_method ?? "squash",
    requireNonDraft: config.readiness?.require_non_draft ?? true,
    requiredApprovals: config.readiness?.required_approvals ?? 1,
    requireResolvedThreads: config.readiness?.require_resolved_threads ?? true,
    jobs: Object.entries(config.jobs).map(([id, job]) => ({
      id,
      checkName: job.check_name,
      source: job.source,
      provides: job.provides,
      necessity: job.necessity.level,
      invalidatedBy: job.freshness.invalidated_by,
      prerequisites: job.prerequisites ?? [],
      cost: job.cost.tier,
      dispatch: job.dispatch,
      automaticRetries:
        job.failure?.automatic_retries ?? config.defaults.max_automatic_retries ?? 0,
      diagnose: job.failure?.diagnose ?? true,
    })),
  };
}
