"""Prepare pinned tools once for selected work; revalidate after branch changes."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys


BUN_VERSION = "1.4.2"
PANDAS_VERSION = "2.2.3"
NUMPY_VERSION = "2.1.3"
DEFAULT_OUTPUT = Path("/tmp/gh-aw/agent-runtime.json")


def output(command, root):
    return subprocess.run(command, cwd=root, check=True, capture_output=True,
                          text=True, timeout=30,
                          env={**os.environ, "PYTHONNOUSERSITE": "1"}).stdout.strip()


def dependency_fingerprint(root):
    names = ["package.json"] + [name for name in ("bun.lock", "bun.lockb") if (root / name).is_file()]
    if len(names) == 1 or not (root / "package.json").is_file():
        raise ValueError("A package manifest and committed Bun lock are required; do not use an unfrozen install")
    files = {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in names}
    return hashlib.sha256(json.dumps(files, sort_keys=True).encode()).hexdigest()


def python_versions(executable, root):
    # Isolated mode excludes repository modules as well as user-site packages.
    # These probes inspect the tool installation, never candidate Python code.
    return json.loads(output([executable, "-I", "-c",
        "import json,platform,pandas,numpy; print(json.dumps({'python':platform.python_version(),"
        "'pandas':pandas.__version__,'numpy':numpy.__version__}))"], root))


def verify_tools(python, bun, root):
    versions = python_versions(python, root)
    if not versions["python"].startswith("3.12."):
        raise ValueError("The selected Python executable is not Python 3.12")
    if versions["pandas"] != PANDAS_VERSION or versions["numpy"] != NUMPY_VERSION:
        raise ValueError("The selected Python lacks the pinned pandas/numpy versions")
    bun_version = output([bun, "--version"], root)
    if bun_version != BUN_VERSION:
        raise ValueError("The selected Bun executable is not Bun " + BUN_VERSION)
    return {**versions, "bun": bun_version}


def prepare(root, previous):
    python = sys.executable
    version = output([python, "-I", "-c", "import platform; print(platform.python_version())"], root)
    if not version.startswith("3.12."):
        raise ValueError("Runtime setup must provide Python 3.12 before provisioning")
    source_bun = shutil.which("bun")
    if not source_bun or output([source_bun, "--version"], root) != BUN_VERSION:
        raise ValueError("Runtime setup must provide Bun " + BUN_VERSION + " before provisioning")
    # gh-aw exposes RUNNER_TOOL_CACHE inside the sandbox. setup-bun's normal
    # home-directory install is not a reliable sandbox-visible location.
    cache = os.environ.get("RUNNER_TOOL_CACHE")
    if not cache:
        raise ValueError("RUNNER_TOOL_CACHE is required for sandbox-visible Bun")
    bun = Path(cache) / "tsb-bun" / BUN_VERSION / "bin" / "bun"
    bun.parent.mkdir(parents=True, exist_ok=True)
    if Path(source_bun).resolve() != bun.resolve():
        shutil.copy2(source_bun, bun)
    fingerprint = dependency_fingerprint(root)
    reinstall = (previous.get("status") != "ready" or
                 previous.get("dependency_fingerprint") != fingerprint or
                 not (root / "node_modules").is_dir())
    if reinstall:
        subprocess.run([str(bun), "install", "--frozen-lockfile", "--ignore-scripts"],
                       cwd=root, check=True, timeout=600)
    try:
        versions = python_versions(python, root)
    except (subprocess.SubprocessError, ValueError, OSError):
        versions = {}
    if versions.get("pandas") != PANDAS_VERSION or versions.get("numpy") != NUMPY_VERSION:
        subprocess.run([python, "-I", "-m", "pip", "install", "--no-user", "--disable-pip-version-check", "--only-binary=:all:",
                        "pandas==" + PANDAS_VERSION, "numpy==" + NUMPY_VERSION],
                       cwd=root, check=True, timeout=600,
                       env={**os.environ, "PYTHONNOUSERSITE": "1"})
    versions = verify_tools(python, str(bun), root)
    if dependency_fingerprint(root) != fingerprint:
        raise ValueError("Dependency setup modified the candidate manifest/lock")
    return {"status": "ready", "python_executable": python, "bun_executable": str(bun),
            "versions": versions, "dependency_fingerprint": fingerprint,
            "dependencies_reinstalled": reinstall,
            "head_sha": output(["git", "rev-parse", "HEAD"], root)}


def environment_exports(report):
    return ("export PATH=" + shlex.quote(str(Path(report["bun_executable"]).parent)) + ":" +
            shlex.quote(str(Path(report["python_executable"]).parent)) + ':"$PATH"\n' +
            "export PYTHONNOUSERSITE=1\n")


def stage_runtime(actions_dir, selection, report):
    """Stage startup authority where gh-aw mounts it read-only in the sandbox."""
    if not actions_dir.is_absolute():
        raise ValueError("The trusted actions directory must be absolute")
    actions_dir.mkdir(parents=True, exist_ok=True)
    source = Path(__file__).resolve()
    shutil.copy2(source, actions_dir / "tsb_provision_agent_runtime.py")
    shutil.copy2(source.with_name("tsb_runtime_harness.cjs"), actions_dir / "tsb_runtime_harness.cjs")
    for helper in ("sync_automation_branch.sh", "automation_branch_state.py", "capture_agent_branch_state.py", "automation_ci.py"):
        shutil.copy2(source.with_name(helper), actions_dir / helper)
    (actions_dir / "tsb_agent_runtime_selection.json").write_text(json.dumps(selection, indent=2) + "\n")
    (actions_dir / "tsb_agent_runtime_manifest.json").write_text(
        json.dumps({"schema_version": 1, **report}, indent=2) + "\n")
    if report["status"] == "ready":
        (actions_dir / "tsb_agent_runtime_env.sh").write_text(environment_exports(report))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--selection", type=Path)
    parser.add_argument("--check-only", action="store_true")
    # This helper is staged outside the checkout before the agent changes
    # branches. Its own path must never determine which candidate is checked.
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--stage-actions-dir", type=Path)
    args = parser.parse_args(argv)
    try:
        previous = json.loads(args.output.read_text()) if args.output.exists() else {}
        if not isinstance(previous, dict):
            raise ValueError("Invalid prior runtime evidence")
        if args.check_only:
            if args.stage_actions_dir:
                raise ValueError("Only host provisioning may stage trusted startup files")
            if previous.get("status") != "ready":
                raise ValueError("No successful runtime provisioning evidence exists")
            versions = verify_tools(previous["python_executable"], previous["bun_executable"], args.repo_root)
            if dependency_fingerprint(args.repo_root) != previous.get("dependency_fingerprint"):
                raise ValueError("Branch manifest/lock changed; revalidate with --selection before testing")
            if not (args.repo_root / "node_modules").is_dir():
                raise ValueError("Repository dependencies are missing; revalidate with --selection")
            print("Sandbox runtime verified: " + json.dumps(versions, sort_keys=True))
            return 0
        if not args.selection:
            raise ValueError("Provide --selection or --check-only")
        selection = json.loads(args.selection.read_text())
        if not isinstance(selection, dict) or "selected" not in selection:
            raise ValueError("Scheduler output must explicitly identify selected work")
        if selection.get("error"):
            raise ValueError("Scheduler failed; do not install dependencies for guessed work")
        if selection.get("selected") is None:
            report = {"status": "skipped", "reason": "No selected work; dependency setup skipped"}
        else:
            report = prepare(args.repo_root, previous)
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.with_suffix(".env").write_text(environment_exports(report))
        if args.stage_actions_dir:
            stage_runtime(args.stage_actions_dir, selection, report)
        code = 0
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
        report = {"status": "setup_error", "error": str(error)}
        code = 1
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, sort_keys=True))
    return code


if __name__ == "__main__":
    sys.exit(main())
