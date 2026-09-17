"""Keep unrelated orchestration edits out of the full Pages benchmark sweep."""
import fnmatch
from pathlib import Path
import unittest


WORKFLOW = Path(__file__).resolve().parents[1] / "pages.yml"


class PagesWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.text = WORKFLOW.read_text()
        section = self.text.split("    paths:\n", 1)[1].split("  workflow_dispatch:", 1)[0]
        self.patterns = [line.strip()[3:-1] for line in section.splitlines()
                         if line.strip().startswith("- '")]

    def eligible(self, name):
        selected = False
        for pattern in self.patterns:
            excluded = pattern.startswith("!")
            if fnmatch.fnmatchcase(name, pattern.removeprefix("!")):
                selected = not excluded
        return selected

    def test_non_input_agent_and_policy_edits_do_not_launch_sweep(self):
        for name in (".github/workflows/goal.md", ".github/workflows/autoloop.lock.yml",
                     ".github/workflows/scripts/automation_ci.py", ".github/workflows/ci.yml",
                     ".github/merge-steward.yml", ".github/merge-steward.schema.json",
                     ".github/merge-steward/reconcile.mjs"):
            with self.subTest(name=name):
                self.assertFalse(self.eligible(name))

    def test_deployment_and_all_other_current_or_future_inputs_remain_eligible(self):
        for name in (".github/workflows/pages.yml", "src/index.ts", "benchmarks/runner.py",
                     "playground/benchmarks.html", "rust/pkg/tsb_wasm_bg.wasm",
                     "scripts/validate-python-examples.py", "package.json", "bun.lockb",
                     "bunfig.toml", "tsconfig.json", "new-input/data.json", ".npmrc"):
            with self.subTest(name=name):
                self.assertTrue(self.eligible(name))

    def test_manual_runs_and_pinned_frozen_runtime_are_preserved(self):
        self.assertIn("  workflow_dispatch:", self.text)
        self.assertIn("bun-version: '1.4.2'", self.text)
        self.assertIn("run: bun install --frozen-lockfile", self.text)
        self.assertNotIn("bun-version: latest", self.text)


if __name__ == "__main__":
    unittest.main()
