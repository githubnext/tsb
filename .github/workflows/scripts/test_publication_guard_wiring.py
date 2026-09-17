"""The pinned compiler must block both publishers on a failed/skipped guard.

These readers intentionally handle only the indentation-based job/step subset
used by the checked-in workflows. They reject missing fields and unknown
condition syntax; they do not execute YAML tags, workflow scripts, or eval().
"""
from pathlib import Path
import re
import textwrap
import unittest

from automation_ci import REQUIRED_JOBS


WORKFLOWS = Path(__file__).resolve().parents[1]
WORKFLOW_NAMES = ("goal", "autoloop")
GUARD = "publication_guard"
REQUIRE_STEP = "Require deterministic publication authorization"


def document(name, suffix):
    source = (WORKFLOWS / (name + suffix)).read_text()
    if suffix == ".md":
        if not source.startswith("---\n") or "\n---\n" not in source[4:]:
            raise AssertionError("Missing workflow frontmatter")
        return source[4:].split("\n---\n", 1)[0]
    return source


def value(block, key, indent=4, step=False):
    prefix = ("(?:" + " " * (indent - 2) + "- |" + " " * indent + ")"
              if step else " " * indent)
    matches = list(re.finditer(r"(?m)^" + prefix + re.escape(key) + r":[ \t]*(.*)$", block))
    if len(matches) > 1:
        raise AssertionError("Duplicate workflow field: " + key)
    if not matches:
        return None
    match = matches[0]
    inline = match.group(1).strip()
    if inline and inline not in (">", ">-", "|", "|-", "|+"):
        return inline
    result = []
    for line in block[match.end():].splitlines():
        if line.strip() and len(line) - len(line.lstrip()) <= indent:
            break
        result.append(line)
    return "\n".join(result).strip("\n")


def jobs(document_text):
    block = value(document_text, "jobs", 0)
    if block is None:
        raise AssertionError("Missing workflow jobs")
    starts = list(re.finditer(r"(?m)^  ([A-Za-z][A-Za-z0-9_-]*):[ \t]*$", block))
    result = {}
    for index, match in enumerate(starts):
        if match.group(1) in result:
            raise AssertionError("Duplicate workflow job")
        end = starts[index + 1].start() if index + 1 < len(starts) else len(block)
        result[match.group(1)] = block[match.end():end]
    if not result:
        raise AssertionError("No recognized workflow jobs")
    return result


def needs(job):
    field = value(job, "needs")
    if field is None:
        return set()
    if field.startswith("[") and field.endswith("]"):
        return {item.strip(" '\"") for item in field[1:-1].split(",") if item.strip()}
    if "\n" not in field and not field.lstrip().startswith("-"):
        return {field.strip(" '\"")}
    return set(re.findall(r"(?m)^\s+- ([A-Za-z][A-Za-z0-9_-]*)\s*$", field))


def steps(block, indent=4, key="steps"):
    field = value(block, key, indent)
    if field is None:
        raise AssertionError("Missing workflow steps")
    starts = list(re.finditer(r"(?m)^" + " " * (indent + 2) + r"- \S", field))
    result = []
    for index, match in enumerate(starts):
        end = starts[index + 1].start() if index + 1 < len(starts) else len(field)
        # Normalize source top-level steps and compiled job steps identically.
        result.append(textwrap.indent(textwrap.dedent(field[match.start():end]), "      "))
    if not result:
        raise AssertionError("No recognized workflow steps")
    return result


def step_value(step, key):
    return value(step, key, 8, step=True)


def named_step(all_steps, name):
    found = [step for step in all_steps if step_value(step, "name") == name]
    if len(found) != 1:
        raise AssertionError("Expected exactly one step: " + name)
    return found[0]


def mapping(block, indent):
    if block is None:
        return {}
    found = re.findall(r"(?m)^" + " " * indent + r"([A-Za-z][A-Za-z0-9_-]*): (.+)$", block)
    if len(found) != len([line for line in block.splitlines() if line.strip()]):
        raise AssertionError("Unexpected workflow mapping syntax")
    if len({key for key, _ in found}) != len(found):
        raise AssertionError("Duplicate workflow mapping field")
    return dict(found)


def condition(expression, state, cancelled=False):
    """Evaluate only the small boolean gate grammar present in these jobs."""
    if not isinstance(expression, str):
        raise AssertionError("Missing publication condition")
    expression = " ".join(expression.split())
    if expression.startswith("${{") and expression.endswith("}}"):
        expression = expression[3:-2].strip()
    token = re.compile(r"\s*(needs\.[a-z_]+\.(?:result|outputs\.[a-z_]+)|'[a-z_]+'|always\(\)|cancelled\(\)|true|false|&&|\|\||==|!=|!|\(|\))")
    tokens, position = [], 0
    while position < len(expression):
        match = token.match(expression, position)
        if match is None:
            raise AssertionError("Unsupported publication condition syntax")
        tokens.append(match.group(1))
        position = match.end()
    cursor = 0

    def consume(expected):
        nonlocal cursor
        if cursor < len(tokens) and tokens[cursor] == expected:
            cursor += 1
            return True
        return False

    def atom():
        nonlocal cursor
        if consume("!"):
            return not atom()
        if consume("("):
            result = either()
            if not consume(")"):
                raise AssertionError("Unclosed publication condition")
            return result
        if cursor >= len(tokens):
            raise AssertionError("Truncated publication condition")
        current = tokens[cursor]
        cursor += 1
        if current.startswith("needs."):
            if current not in state:
                raise AssertionError("Unmodeled publication dependency: " + current)
            return state[current]
        if current.startswith("'"):
            return current[1:-1]
        if current in ("true", "always()"):
            return True
        if current == "false":
            return False
        if current == "cancelled()":
            return cancelled
        raise AssertionError("Unexpected publication condition token")

    def comparison():
        result = atom()
        if consume("=="):
            return result == atom()
        if consume("!="):
            return result != atom()
        return result

    def both():
        result = comparison()
        while consume("&&"):
            right = comparison()
            result = bool(result) and bool(right)
        return result

    def either():
        result = both()
        while consume("||"):
            right = both()
            result = bool(result) or bool(right)
        return result

    result = either()
    if cursor != len(tokens):
        raise AssertionError("Unconsumed publication condition syntax")
    return bool(result)


class PublicationGuardWiringTests(unittest.TestCase):
    def test_source_and_compiled_guard_use_supported_dependency_graph(self):
        for workflow in WORKFLOW_NAMES:
            for suffix in (".md", ".lock.yml"):
                with self.subTest(workflow=workflow, suffix=suffix):
                    graph = jobs(document(workflow, suffix))
                    self.assertEqual(needs(graph[GUARD]), {"activation", "agent"})
                    self.assertIn(GUARD, needs(graph["detection"]))
                    self.assertIn(GUARD, needs(graph["safe_outputs"]))
                    self.assertIn(value(graph["detection"], "continue-on-error"), (None, "false"))
                    self.assertNotIn("continue-on-error:", graph[GUARD])
                    self.assertEqual(value(graph[GUARD], "timeout-minutes"), "5")
                    self.assertEqual(value(graph[GUARD], "allowed", 6), "${{ steps.guard.outputs.allowed }}")
                    reject_steps = steps(graph["detection"], key="pre-steps" if suffix == ".md" else "steps")
                    reject = named_step(reject_steps, REQUIRE_STEP)
                    self.assertIn(step_value(reject, "continue-on-error"), (None, "false"))
                    script = step_value(reject, "run")
                    self.assertRegex(script, r"(?m)^\s+exit 1\s*$")
                    self.assertNotIn("|| true", script)
                    if suffix == ".lock.yml":
                        self.assertIn("detection", needs(graph["push_repo_memory"]))
                        self.assertIn("always()", value(graph["detection"], "if"))
                        self.assertIn("needs.agent.result != 'skipped'", value(graph["detection"], "if"))
                        self.assertIn("needs.detection.result == 'skipped'", value(graph["push_repo_memory"], "if"))
                        self.assertLess(reject_steps.index(reject), next(
                            index for index, step in enumerate(reject_steps)
                            if step_value(step, "name") == "Execute threat detection with AWF"))
                    else:
                        # This pin does not support a jobs.push_repo_memory override.
                        self.assertNotIn("push_repo_memory", graph)

    def test_failed_skipped_or_disallowed_guard_fails_detection_and_blocks_both_publishers(self):
        for workflow in WORKFLOW_NAMES:
            compiled = jobs(document(workflow, ".lock.yml"))
            source = jobs(document(workflow, ".md"))
            reject = named_step(steps(compiled["detection"]), REQUIRE_STEP)
            source_reject = named_step(steps(source["detection"], key="pre-steps"), REQUIRE_STEP)
            for guard_result in ("success", "failure", "skipped", "cancelled"):
                for allowed in ("true", "false", "", "TRUE", "1"):
                    with self.subTest(workflow=workflow, guard_result=guard_result, allowed=allowed):
                        state = {"needs.activation.result": "success", "needs.agent.result": "success",
                                 "needs.publication_guard.result": guard_result,
                                 "needs.publication_guard.outputs.allowed": allowed}
                        self.assertTrue(condition(value(compiled["detection"], "if"), state))
                        rejected = condition(step_value(reject, "if"), state)
                        authorized = guard_result == "success" and allowed == "true"
                        self.assertEqual(rejected, not authorized)
                        self.assertEqual(condition(step_value(source_reject, "if"), state), rejected)
                        self.assertEqual(condition(value(source["safe_outputs"], "if"), state), authorized)
                        # The rejection is a real exit 1, never a skipped detection.
                        state["needs.detection.result"] = "failure" if rejected else "success"
                        for publisher in ("safe_outputs", "push_repo_memory"):
                            self.assertEqual(condition(value(compiled[publisher], "if"), state), authorized)

    def test_no_agent_or_cancelled_work_cannot_publish(self):
        for workflow in WORKFLOW_NAMES:
            compiled = jobs(document(workflow, ".lock.yml"))
            for agent_result in ("failure", "skipped", "cancelled"):
                state = {"needs.activation.result": "success", "needs.agent.result": agent_result,
                         "needs.publication_guard.result": "skipped",
                         "needs.publication_guard.outputs.allowed": "",
                         "needs.detection.result": "skipped"}
                with self.subTest(workflow=workflow, agent_result=agent_result):
                    self.assertFalse(condition(value(compiled[GUARD], "if"), state))
                    for publisher in ("safe_outputs", "push_repo_memory"):
                        self.assertFalse(condition(value(compiled[publisher], "if"), state))
            state.update({"needs.agent.result": "success", "needs.publication_guard.result": "success",
                          "needs.publication_guard.outputs.allowed": "true", "needs.detection.result": "success"})
            for publisher in ("safe_outputs", "push_repo_memory"):
                self.assertFalse(condition(value(compiled[publisher], "if"), state, cancelled=True))

    def test_guard_is_read_only_with_immutable_code_and_step_local_token(self):
        expected_permissions = {key: "read" for key in
                                ("actions", "checks", "contents", "issues", "pull-requests", "statuses")}
        for workflow in WORKFLOW_NAMES:
            for suffix in (".md", ".lock.yml"):
                with self.subTest(workflow=workflow, suffix=suffix):
                    guard = jobs(document(workflow, suffix))[GUARD]
                    self.assertEqual(mapping(value(guard, "permissions"), 6), expected_permissions)
                    self.assertIsNone(value(guard, "env"))
                    all_steps = steps(guard)
                    checkout = named_step(all_steps, "Check out immutable publication checker")
                    self.assertTrue(step_value(checkout, "uses").startswith("actions/checkout@"))
                    checkout_options = mapping(step_value(checkout, "with"), 10)
                    self.assertEqual(checkout_options["ref"], "${{ github.workflow_sha }}")
                    self.assertEqual(checkout_options["path"], "publication-trusted")
                    self.assertEqual(checkout_options["persist-credentials"], "false")
                    checker = named_step(all_steps, "Independently authorize publication")
                    self.assertEqual(step_value(checker, "id"), "guard")
                    self.assertEqual(mapping(step_value(checker, "env"), 10), {"GITHUB_TOKEN": "${{ github.token }}"})
                    self.assertNotIn("secrets.", guard)
                    for step in all_steps:
                        if step != checker:
                            self.assertNotIn("GITHUB_TOKEN", step)
                            self.assertNotIn("github.token", step)
                    script = step_value(checker, "run")
                    self.assertIn("python3 -I publication-trusted/.github/workflows/scripts/automation_publication_guard.py", script)
                    self.assertIn("--workflow " + workflow, script)
                    self.assertIn("--selection", script)
                    self.assertIn("--branch-state", script)
                    self.assertIn("--policy publication-trusted/.github/workflows/publication-approvals.json", script)
                    self.assertNotIn("source ", script)

    def test_candidate_downloads_cannot_overlay_trusted_code_or_each_other(self):
        expected_paths = {"publication-context": "${{ runner.temp }}/publication-context",
                          "repo-memory-default": "${{ runner.temp }}/publication-memory",
                          "agent": "${{ runner.temp }}/publication-agent"}
        for workflow in WORKFLOW_NAMES:
            for suffix in (".md", ".lock.yml"):
                with self.subTest(workflow=workflow, suffix=suffix):
                    all_steps = steps(jobs(document(workflow, suffix))[GUARD])
                    downloads = [step for step in all_steps
                                 if (step_value(step, "uses") or "").startswith("actions/download-artifact@")]
                    actual_paths = {}
                    for step in downloads:
                        options = mapping(step_value(step, "with"), 10)
                        self.assertNotIn("pattern", options)
                        self.assertNotIn("merge-multiple", options)
                        self.assertNotEqual(step_value(step, "continue-on-error"), "true")
                        self.assertNotIn(options["name"], actual_paths)
                        actual_paths[options["name"]] = options["path"]
                        self.assertNotIn("publication-trusted", options["path"])
                    self.assertEqual(actual_paths, expected_paths)
                    checker = named_step(all_steps, "Independently authorize publication")
                    self.assertTrue(all(all_steps.index(step) < all_steps.index(checker) for step in downloads))

    def test_token_free_context_is_captured_and_uploaded_before_inference(self):
        expected_files = {"${{ runner.temp }}/gh-aw/actions/" + filename for filename in (
            "tsb_agent_runtime_selection.json", "tsb_agent_branch_state.json", "tsb_agent_steering.json")}
        for workflow in WORKFLOW_NAMES:
            for suffix in (".md", ".lock.yml"):
                with self.subTest(workflow=workflow, suffix=suffix):
                    text = document(workflow, suffix)
                    all_steps = (steps(text, 0, "pre-agent-steps") if suffix == ".md"
                                 else steps(jobs(text)["agent"]))
                    capture = named_step(all_steps, "Capture authenticated branch evidence before inference")
                    upload = named_step(all_steps, "Preserve token-free host selection for publication checks")
                    self.assertLess(all_steps.index(capture), all_steps.index(upload))
                    self.assertTrue(step_value(upload, "uses").startswith("actions/upload-artifact@"))
                    options = step_value(upload, "with")
                    self.assertEqual(value(options, "name", 10), "publication-context")
                    self.assertEqual(value(options, "if-no-files-found", 10), "error")
                    self.assertEqual({line.strip() for line in value(options, "path", 10).splitlines()}, expected_files)
                    self.assertNotIn("GITHUB_TOKEN", upload)
                    self.assertNotEqual(step_value(upload, "continue-on-error"), "true")
                    self.assertIn("capture_agent_branch_state.py", step_value(capture, "run"))
                    self.assertIn("capture_agent_steering.py", step_value(capture, "run"))
                    if suffix == ".lock.yml":
                        execute = named_step(all_steps, "Execute GitHub Copilot CLI")
                        self.assertLess(all_steps.index(upload), all_steps.index(execute))

    def test_publication_controls_are_not_added_as_merge_gates(self):
        ci = (WORKFLOWS / "ci.yml").read_text()
        for name in (GUARD, "safe_outputs", "push_repo_memory"):
            self.assertNotIn(name, ci)
        self.assertTrue(REQUIRED_JOBS.issubset({value(job, "name") for job in jobs(ci).values()}))
        inventory = jobs((WORKFLOWS.parent / "merge-steward.yml").read_text())
        for workflow in WORKFLOW_NAMES:
            for job_id in (GUARD, "detection", "safe_outputs"):
                source = f".github/workflows/{workflow}.md#{job_id}"
                entries = [job for job in inventory.values() if value(job, "source") == source]
                self.assertEqual(len(entries), 1, source)
                self.assertEqual(value(value(entries[0], "necessity"), "level", 6), "advisory")
            for job in inventory.values():
                if value(job, "source") == f".github/workflows/{workflow}.md#push_repo_memory":
                    self.assertEqual(value(value(job, "necessity"), "level", 6), "advisory")


if __name__ == "__main__":
    unittest.main()
