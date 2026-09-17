"""State/selection/approval regressions, including the real false-acceptance run."""
import base64
import copy
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

from automation_publication_evidence import candidate_evidence
from automation_publication_guard import (
    bind_selection, check_memory_baseline, check_steering, classify_change, digest_files, evaluate, machine_state,
    main, read_outputs, read_proposal, remote_memory, strict_json,
)
from test_automation_publication_evidence import Fixture, review


REPO = "githubnext/tsb"
HEAD, TREE = "a" * 40, "b" * 40
EMPTY_POLICY = {"schema_version": 1, "approvals": []}


def state(**changes):
    fields = {"Issue": "#221", "Branch": "autoloop/perf-comparison", "PR": "#503",
              "Last Run": "2026-09-17T00:00:00Z", "Iteration Count": "1",
              "Best Metric": "837", "Paused": "false", "Completed": "false",
              "Recent Statuses": "pending-ci", "Pending Tree": TREE}
    fields.update(changes)
    heading = "## Machine State" if fields["Branch"].startswith("goal/") else "## ⚙️ Machine State"
    return "# State\n\n" + heading + "\n\n| Field | Value |\n|---|---|\n" + "".join(
        f"| {key} | {value} |\n" for key, value in fields.items())


def context(workflow="autoloop"):
    if workflow == "goal":
        selection = {"selected": {"number": 500, "state_file": "500-goal-test.md",
                                  "branch": "goal/500-goal-test", "existing_pr": 505}}
        branch, pr = "goal/500-goal-test", 505
    else:
        selection = {"selected": "perf-comparison", "selected_issue": 221,
                     "head_branch": "autoloop/perf-comparison", "existing_pr": 503}
        branch, pr = "autoloop/perf-comparison", 503
    snapshot = {"schema_version": 1, "status": "ready", "repository": REPO,
                "branch": branch, "base": "main", "existing_pr": pr, "head_sha": HEAD,
                "run_id": "123", "run_attempt": "1",
                "selection_digest": hashlib.sha256(json.dumps(selection, sort_keys=True, separators=(",", ":")).encode()).hexdigest()}
    return selection, snapshot


def approval(metric="843", completion=False):
    return {"schema_version": 1, "approvals": [{
        "workflow": "autoloop", "state_path": "perf-comparison.md", "issue": 221, "pr": 503,
        "branch": "autoloop/perf-comparison", "base": "main", "head_sha": HEAD, "tree_sha": TREE,
        "criterion": "maintainer-reviewed-checkpoint-v1", "evaluator": "reviewed-ci-contract-v1",
        "metric": metric, "allow_completion": completion,
    }]}


def steering_context(selection, snapshot):
    snapshots = [{"route": f"/repos/{REPO}/issues/221", "number": 221, "state": "open",
                  "updated_at": "2026-09-17T00:00:00Z", "comments": 333, "review_comments": None},
                 {"route": f"/repos/{REPO}/pulls/503", "number": 503, "state": "open",
                  "updated_at": "2026-09-17T00:00:00Z", "comments": 5, "review_comments": 1, "head_sha": HEAD}]
    result = {**{key: snapshot[key] for key in ("repository", "run_id", "run_attempt", "selection_digest", "branch", "head_sha")},
              "schema_version": 1, "status": "ready", "complete": True, "metadata_snapshots": snapshots,
              "memory": {"file": "perf-comparison.md", "sha256": hashlib.sha256(state().encode()).hexdigest()}}
    result["evidence_digest"] = hashlib.sha256(json.dumps(result, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    current = {entry["route"]: {**entry, **({"head": {"sha": entry["head_sha"]}} if "head_sha" in entry else {})}
               for entry in snapshots}
    return result, current


class GuardTests(unittest.TestCase):
    def evaluate(self, before, after, *, policy=None, outputs=None, verify=None,
                 workflow="autoloop", path="perf-comparison.md", selection=None, snapshot=None):
        selected, branch = context(workflow)
        files = {path: before}
        baseline = {"commit_sha": "c" * 40, "tree_sha": "d" * 40,
                    "digest": digest_files(files), "files": files}
        return evaluate(REPO, workflow, baseline, {path: after}, outputs or [], policy or EMPTY_POLICY,
                        verify or Mock(return_value={"ci": "success"}),
                        selected if selection is None else selection,
                        branch if snapshot is None else snapshot, "123", "1")

    def test_pending_and_blocked_updates_need_no_candidate_acceptance(self):
        verify = Mock(side_effect=AssertionError("Pending work must not perform acceptance reads"))
        before = state()
        for after in (state(**{"Last Run": "later", "Pending Tree": "e" * 40}),
                      state(**{"Recent Statuses": "blocked", "Paused": "true"}),
                      state(**{"Recent Statuses": "rejected", "Pending Tree": "—"}),
                      state(**{"Recent Statuses": "quality-rejected", "Paused": "true", "Pending Tree": "—"})):
            with self.subTest(after=after):
                self.assertTrue(self.evaluate(before, after, verify=verify)["allowed"])
        verify.assert_not_called()

    def test_all_metric_changes_require_explicit_approved_receipt(self):
        for metric in ("843", "1", "—"):
            with self.subTest(metric=metric), self.assertRaisesRegex(ValueError, "No unique approved"):
                self.evaluate(state(), state(**{"Best Metric": metric}))

    def test_initial_metric_and_accepted_iteration_require_approval(self):
        before = state(**{"Best Metric": "—"})
        with self.assertRaisesRegex(ValueError, "approved"):
            self.evaluate(before, state())
        before = state(**{"Recent Statuses": "accepted"})
        after = state(**{"Recent Statuses": "accepted", "Iteration Count": "2"})
        with self.assertRaisesRegex(ValueError, "approved"):
            self.evaluate(before, after)

    def test_new_accepted_history_cannot_hide_before_a_pending_outcome(self):
        with self.assertRaisesRegex(ValueError, "approved"):
            self.evaluate(state(), state(**{"Recent Statuses": "accepted, pending-ci", "Iteration Count": "2"}))
        before = state(**{"Recent Statuses": "accepted"})
        after = state(**{"Recent Statuses": "accepted, pending-ci", "Iteration Count": "2"})
        self.assertTrue(self.evaluate(before, after)["allowed"])

    def test_reviewed_exact_candidate_must_still_pass_independent_evidence(self):
        fixture = Fixture()
        verify = lambda *args: candidate_evidence(*args, fixture.get)
        result = self.evaluate(state(), state(**{"Best Metric": "843"}), policy=approval(), verify=verify)
        self.assertTrue(result["allowed"])
        self.assertEqual(result["changes"][0]["evidence"]["head_sha"], HEAD)
        self.assertTrue(any("/check-runs?" in path for path in fixture.calls))
        self.assertTrue(any("/status?" in path for path in fixture.calls))

    def test_approved_criterion_does_not_override_changes_requested(self):
        fixture = Fixture()
        fixture.reviews = [review(1, "CHANGES_REQUESTED")]
        with self.assertRaisesRegex(ValueError, "changes-requested"):
            self.evaluate(state(), state(**{"Best Metric": "843"}), policy=approval(),
                          verify=lambda *args: candidate_evidence(*args, fixture.get))

    def test_approved_criterion_does_not_override_missing_pr_rollup(self):
        fixture = Fixture()
        fixture.checks = []
        # Regression for Goal run35261222408: native CI was true, but the model
        # omitted PR-rollup verification. The host never trusts that omission.
        with self.assertRaises(ValueError):
            self.evaluate(state(), state(**{"Best Metric": "843"}), policy=approval(),
                          verify=lambda *args: candidate_evidence(*args, fixture.get))

    def test_wrong_metric_criterion_identity_and_candidate_are_denied(self):
        for change in ({"metric": "844"}, {"criterion": ""}, {"evaluator": ""},
                       {"head_sha": "e" * 40}, {"issue": 1}, {"pr": 504}, {"base": "other"}):
            policy = approval()
            policy["approvals"][0].update(change)
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.evaluate(state(), state(**{"Best Metric": "843"}), policy=policy)

    def test_goal_completion_has_no_implicit_approved_criterion(self):
        before = state(Issue="#500", Branch="goal/500-goal-test", PR="#505", Status="active")
        after = before.replace("| Status | active |", "| Status | completed |").replace(
            "| Completed | false |", "| Completed | true |")
        with self.assertRaisesRegex(ValueError, "No unique approved"):
            self.evaluate(before, after, workflow="goal", path="500-goal-test.md")

    def test_unchanged_existing_completed_goal_is_not_reset(self):
        before = state(Issue="#500", Branch="goal/500-goal-test", PR="#505", Status="completed", Completed="true")
        after = before.replace("2026-09-17T00:00:00Z", "2026-09-18T00:00:00Z")
        self.assertTrue(self.evaluate(before, after, workflow="goal", path="500-goal-test.md")["allowed"])

    def test_new_verified_head_or_tree_requires_approval_even_without_completion(self):
        for field in ("Verified Head", "Verified Tree"):
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, "approved"):
                self.evaluate(state(), state(**{field: HEAD}))

    def test_untyped_pending_clearance_cannot_impersonate_resolution(self):
        before = state(**{"Verified Head": HEAD})
        cleared = state(**{"Verified Head": HEAD, "Pending Tree": "—"})
        omitted = "\n".join(line for line in before.splitlines() if not line.startswith("| Pending Tree |")) + "\n"
        for after in (cleared, omitted):
            with self.subTest(after=after), self.assertRaisesRegex(ValueError, "approved"):
                self.evaluate(before, after)

    def test_typed_goal_blocked_clearance_remains_nonacceptance(self):
        before = state(Issue="#500", Branch="goal/500-goal-test", PR="#505", Status="active")
        after = before.replace("| Status | active |", "| Status | blocked |").replace(
            "| Pending Tree | " + TREE + " |", "| Pending Tree | — |")
        self.assertTrue(self.evaluate(before, after, workflow="goal", path="500-goal-test.md")["allowed"])

    def test_agent_cannot_unpause_or_reset_completion(self):
        for field in ("Paused", "Completed"):
            with self.subTest(field=field), self.assertRaises(ValueError):
                self.evaluate(state(**{field: "true"}), state(**{field: "false"}))

    def test_boolean_status_and_duplicate_field_ambiguity_fail_closed(self):
        for content in (state(Paused="False"), state(Completed="TRUE"), state(Blocked="0"),
                        state(**{"Recent Statuses": "ACCEPTED"}), state(Status="Completed"),
                        state() + "| Best Metric | 0 |\n", state() + "\n## Machine State\n| X | y |\n"):
            with self.subTest(content=content), self.assertRaises(ValueError):
                machine_state(content)

    def test_actual_consumer_backticks_headings_and_hidden_duplicate_rows_cannot_unpause(self):
        before = state(Paused="true")
        afters = [state(Paused="`true`"), state(**{"Iteration Count": "`1`"}),
                  before.replace("## ⚙️ Machine State", "## Machine State"),
                  before + "  | Paused | false |\n", before + "> | Paused | false |\n",
                  before + "##\tHidden\n| Paused | false |\n"]
        for after in afters:
            with self.subTest(after=after), self.assertRaises(ValueError):
                self.evaluate(before, after)
        goal = state(Issue="#500", Branch="goal/500-goal-test", PR="#505", Completed="true")
        with self.assertRaises(ValueError):
            self.evaluate(goal, goal.replace("| Completed | true |", "| Completed | `true` |"),
                          workflow="goal", path="500-goal-test.md")

    def test_unrelated_state_or_identity_changes_are_blocked(self):
        for after in (state(Issue="#1"), state(Branch="autoloop/other"), state(PR="#504")):
            with self.subTest(after=after), self.assertRaises(ValueError):
                self.evaluate(state(), after)
        with self.assertRaisesRegex(ValueError, "outside the selected"):
            self.evaluate(state(), state(**{"Last Run": "later"}), path="unrelated.md")

    def test_only_selected_issue_pr_and_branch_can_receive_outputs(self):
        valid = [{"type": "add_comment", "item_number": 221, "body": "Pending evidence"},
                 {"type": "push_to_pull_request_branch", "pull_request_number": 503,
                  "branch": "autoloop/perf-comparison"}]
        self.assertTrue(self.evaluate(state(), state(), outputs=valid)["allowed"])
        for output in ({"type": "add_comment", "item_number": 1, "body": "Pending"},
                       {"type": "add_comment", "item_number": 221, "repo": "other/repo", "body": "Pending"},
                       {"type": "push_to_pull_request_branch", "pull_request_number": 503, "branch": "other"}):
            with self.subTest(output=output), self.assertRaises(ValueError):
                self.evaluate(state(), state(), outputs=[output])

    def test_explicit_completion_actions_cannot_bypass_memory_approval(self):
        for output in ({"type": "add_labels", "item_number": 221, "labels": ["goal/completed"]},
                       {"type": "update_issue", "item_number": 221, "state": "closed"},
                       {"type": "update_issue", "item_number": 221, "status": "closed"},
                       {"type": "update_issue", "item_number": 221, "labels": []},
                       {"type": "update_issue", "item_number": 221, "labels": ["autoloop-program", "completed"]},
                       {"type": "remove_labels", "item_number": 221, "labels": ["goal"]},
                       {"type": "remove_labels", "item_number": 221, "labels": ["autoloop-program"]}):
            with self.subTest(output=output), self.assertRaisesRegex(ValueError, "Terminal safe output"):
                self.evaluate(state(), state(), outputs=[output])

    def test_nonterminal_approved_checkpoint_cannot_deactivate_or_complete_work(self):
        for output in ({"type": "add_labels", "item_number": 221, "labels": ["goal/completed"]},
                       {"type": "update_issue", "item_number": 221, "state": "closed"},
                       {"type": "update_issue", "item_number": 221, "status": "closed"},
                       {"type": "update_issue", "item_number": 221, "labels": []},
                       {"type": "remove_labels", "item_number": 221, "labels": ["autoloop-program"]}):
            with self.subTest(output=output), self.assertRaisesRegex(ValueError, "Terminal safe output"):
                self.evaluate(state(), state(**{"Best Metric": "843"}), policy=approval(), outputs=[output])

    def test_replacement_labels_preserving_scheduler_remain_nonterminal(self):
        output = {"type": "update_issue", "item_number": 221, "labels": ["autoloop-program", "blocked"]}
        self.assertTrue(self.evaluate(state(), state(), outputs=[output])["allowed"])

    def test_case_aliases_and_publisher_sanitizer_labels_cannot_deactivate_work(self):
        for label in ("GoAl", "AUTOLOOP-PROGRAM", "go'al", "go\0al", "goal ", "<goal>", {"name": "goal"}):
            with self.subTest(label=label), self.assertRaises(ValueError):
                self.evaluate(state(), state(), outputs=[{"type": "remove_labels", "item_number": 221, "labels": [label]}])

    def test_comments_never_supply_evidence_or_semantic_authority(self):
        # No semantic classifier: narrative alone is neither scored nor proof.
        result = self.evaluate(state(), state(), outputs=[
            {"type": "add_comment", "item_number": 221, "body": "Previously accepted 837; current work pending"}])
        self.assertEqual(result["changes"], [])

    def test_null_selection_only_allows_unchanged_memory_and_no_external_writes(self):
        selection, snapshot = {"selected": None}, {"schema_version": 1, "status": "skipped"}
        self.assertTrue(self.evaluate(state(), state(), selection=selection, snapshot=snapshot,
                                      outputs=[{"type": "noop"}])["allowed"])
        with self.assertRaises(ValueError):
            self.evaluate(state(), state(**{"Last Run": "later"}), selection=selection, snapshot=snapshot)
        with self.assertRaises(ValueError):
            self.evaluate(state(), state(), selection=selection, snapshot=snapshot,
                          outputs=[{"type": "create_issue", "body": "Setup"}])

    def test_missing_mutated_or_other_run_context_is_rejected(self):
        selection, snapshot = context()
        for change in ({"run_id": "124"}, {"run_attempt": "2"}, {"repository": "other/repo"},
                       {"selection_digest": "0" * 64}, {"status": "error"}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                bind_selection(REPO, "autoloop", selection, {**snapshot, **change}, "123", "1")
        with self.assertRaises(ValueError):
            bind_selection(REPO, "autoloop", {}, snapshot)

    def test_report_is_explicitly_snapshot_not_compare_and_swap(self):
        result = self.evaluate(state(), state(**{"Last Run": "later"}))
        self.assertIn("not compare-and-swap", result["semantics"])
        self.assertEqual(result["proposal_digest"], digest_files({"perf-comparison.md": state(**{"Last Run": "later"})}))

    def test_steering_metadata_is_freshly_read_and_bound_not_a_body_equivalence_claim(self):
        selection, snapshot = context()
        steering, current = steering_context(selection, snapshot)
        result = check_steering(REPO, selection, snapshot, steering, current.__getitem__)
        self.assertTrue(result["metadata_unchanged"])
        self.assertIn("not complete", result["semantics"])
        for field, value in (("comments", 334), ("state", "closed"), ("updated_at", "later")):
            changed = copy.deepcopy(current)
            changed[f"/repos/{REPO}/issues/221"][field] = value
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, "changed after startup"):
                check_steering(REPO, selection, snapshot, steering, changed.__getitem__)

    def test_missing_incomplete_mutated_or_unbound_steering_is_rejected(self):
        selection, snapshot = context()
        steering, current = steering_context(selection, snapshot)
        for change in ({"complete": False}, {"run_id": "124"}, {"metadata_snapshots": []}, {"evidence_digest": "0" * 64}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                check_steering(REPO, selection, snapshot, {**steering, **change}, current.__getitem__)

    def test_midrun_human_memory_edits_and_startup_absence_cannot_be_overwritten(self):
        selection, snapshot = context()
        binding = bind_selection(REPO, "autoloop", selection, snapshot)
        steering, _ = steering_context(selection, snapshot)
        check_memory_baseline(binding, steering, {"files": {"perf-comparison.md": state()}})
        for files in ({"perf-comparison.md": state() + "\n## Current Priorities\nHuman guidance\n"}, {}):
            with self.subTest(files=files), self.assertRaisesRegex(ValueError, "memory changed after startup"):
                check_memory_baseline(binding, steering, {"files": files})
        absent = {"memory": {"file": "perf-comparison.md"}}
        check_memory_baseline(binding, absent, {"files": {}})
        with self.assertRaisesRegex(ValueError, "memory changed after startup"):
            check_memory_baseline(binding, absent, {"files": {"perf-comparison.md": state()}})

    def test_real_rejected_autoloop_artifact_cannot_publish_false_acceptance(self):
        fixture = json.loads(Path(__file__).with_name("fixtures").joinpath(
            "autoloop-rejected-35260600725.json").read_text())
        self.assertIn("| Best Metric | 837 |", fixture["before"])
        self.assertIn("| Best Metric | 843 |", fixture["proposed"])
        self.assertIn("Accepted", fixture["outputs"][0]["body"])
        verify = Mock(side_effect=AssertionError("No approved objective; do not spend API calls on acceptance"))
        with self.assertRaisesRegex(ValueError, "No unique approved criterion/evaluator"):
            self.evaluate(fixture["before"], fixture["proposed"], outputs=fixture["outputs"], verify=verify)
        verify.assert_not_called()


class ArtifactTests(unittest.TestCase):
    def test_cli_replay_of_real_false_acceptance_exits_nonzero_and_emits_denial(self):
        fixture = json.loads(Path(__file__).with_name("fixtures").joinpath(
            "autoloop-rejected-35260600725.json").read_text())
        selection, snapshot = context()
        steering, _ = steering_context(selection, snapshot)
        steering["memory"]["sha256"] = hashlib.sha256(fixture["before"].encode()).hexdigest()
        unsigned = {key: value for key, value in steering.items() if key != "evidence_digest"}
        steering["evidence_digest"] = hashlib.sha256(json.dumps(unsigned, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
        baseline_files = {fixture["state_path"]: fixture["before"]}
        baseline = {"files": baseline_files, "commit_sha": "c" * 40, "tree_sha": "d" * 40,
                    "digest": digest_files(baseline_files)}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            memory = root / "memory"
            memory.mkdir()
            (memory / fixture["state_path"]).write_text(fixture["proposed"])
            for name, value in (("selection", selection), ("branch", snapshot), ("steering", steering)):
                (root / (name + ".json")).write_text(json.dumps(value))
            (root / "safeoutputs.jsonl").write_text("\n".join(json.dumps(item) for item in fixture["outputs"]))
            args = ["--repository", REPO, "--workflow", "autoloop", "--proposal", str(memory),
                    "--safeoutputs", str(root / "safeoutputs.jsonl"), "--selection", str(root / "selection.json"),
                    "--branch-state", str(root / "branch.json"), "--steering", str(root / "steering.json"),
                    "--report", str(root / "report.json")]
            env = {"GITHUB_TOKEN": "fixture-read-token", "GITHUB_RUN_ID": "123", "GITHUB_RUN_ATTEMPT": "1",
                   "GITHUB_OUTPUT": str(root / "outputs")}
            with patch.dict("os.environ", env), patch("automation_publication_guard.remote_memory", return_value=baseline), \
                    patch("automation_publication_guard.candidate_evidence", side_effect=AssertionError("No approval")), \
                    patch("sys.stderr", new_callable=io.StringIO) as error:
                self.assertEqual(main(args), 1)
            report = json.loads((root / "report.json").read_text())
            self.assertFalse(report["allowed"])
            self.assertEqual(report["baseline"]["digest"], baseline["digest"])
            self.assertIn("No unique approved criterion/evaluator", report["reason"])
            self.assertEqual((root / "outputs").read_text(), "allowed=false\n")
            self.assertNotIn("fixture-read-token", error.getvalue())

    def test_plain_markdown_overlay_preserves_omitted_baseline_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "perf-comparison.md").write_text(state())
            proposal = read_proposal(root)
            baseline = {"files": {"perf-comparison.md": state(), "other.md": state(Paused="true")},
                        "commit_sha": "c" * 40, "tree_sha": "d" * 40, "digest": "e" * 64}
            selection, snapshot = context()
            self.assertTrue(evaluate(REPO, "autoloop", baseline, proposal, [], EMPTY_POLICY, Mock(),
                                     selection, snapshot)["allowed"])

    def test_symlinks_nonmarkdown_and_oversized_files_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "state.md").symlink_to("/etc/passwd")
            with self.assertRaises(ValueError):
                read_proposal(root)
            (root / "state.md").unlink()
            (root / "state.txt").write_text("data")
            with self.assertRaises(ValueError):
                read_proposal(root)
            (root / "state.txt").unlink()
            (root / "state.md").write_text("x" * 30721)
            with self.assertRaises(ValueError):
                read_proposal(root)
            self.assertEqual(len(read_proposal(root, 40960)["state.md"]), 30721)

    def test_missing_artifacts_duplicate_json_and_bad_roots_fail(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory, "outputs.jsonl")
            with self.assertRaises(ValueError):
                read_outputs(path)
            path.write_text('{"type":"noop","type":"add_comment"}\n')
            with self.assertRaises(ValueError):
                read_outputs(path)
        for value in ('{"a":1,"a":2}', '{"a":NaN}'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                strict_json(value)

    def memory_api(self):
        raw = state().encode()
        blob = hashlib.sha1(f"blob {len(raw)}\0".encode() + raw).hexdigest()
        commit, tree = "c" * 40, "d" * 40
        prefix = "/repos/" + REPO
        values = {
            prefix + "/git/ref/heads/memory/autoloop": {"ref": "refs/heads/memory/autoloop", "object": {"type": "commit", "sha": commit}},
            prefix + "/git/commits/" + commit: {"sha": commit, "tree": {"sha": tree}},
            prefix + "/git/trees/" + tree + "?recursive=1": {"sha": tree, "truncated": False, "tree": [
                {"path": "perf-comparison.md", "sha": blob, "type": "blob", "mode": "100644", "size": len(raw)}]},
            prefix + "/git/blobs/" + blob: {"sha": blob, "encoding": "base64", "size": len(raw), "content": base64.b64encode(raw).decode()},
        }
        return values

    def test_remote_baseline_uses_authenticated_git_objects_without_checkout(self):
        values = self.memory_api()
        result = remote_memory(REPO, "memory/autoloop", values.__getitem__)
        self.assertEqual(result["files"]["perf-comparison.md"], state())
        self.assertEqual(result["digest"], digest_files(result["files"]))

    def test_truncated_wrong_ref_symlink_and_corrupt_blob_fail_closed(self):
        for kind in ("truncated", "ref", "symlink", "blob"):
            values = self.memory_api()
            if kind == "truncated":
                next(v for k, v in values.items() if "/git/trees/" in k)["truncated"] = True
            elif kind == "ref":
                next(v for k, v in values.items() if "/git/ref/" in k)["ref"] = "refs/heads/other"
            elif kind == "symlink":
                next(v for k, v in values.items() if "/git/trees/" in k)["tree"][0]["mode"] = "120000"
            else:
                next(v for k, v in values.items() if "/git/blobs/" in k)["content"] = "YQ=="
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                remote_memory(REPO, "memory/autoloop", values.__getitem__)


if __name__ == "__main__":
    unittest.main()
