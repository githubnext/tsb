"use strict";

// gh-aw invokes this inside its sandbox, after its broad tool-cache PATH setup.
// This file, its helper, and its manifest are staged into the read-only actions
// mount before inference. Agent-writable runtime reports are not our authority.
const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const { constants } = require("node:os");

const EXPECTED = { bun: "1.4.2", pandas: "2.2.3", numpy: "2.1.3" };

function checkVersions(versions) {
  if (!versions || typeof versions.python !== "string" || !versions.python.startsWith("3.12.")) {
    throw new Error("The default Python must be Python 3.12");
  }
  for (const [name, expected] of Object.entries(EXPECTED)) {
    if (versions[name] !== expected) throw new Error(`The default ${name} must be ${expected}`);
  }
}

function readManifest(actionsDir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(actionsDir, "tsb_agent_runtime_manifest.json"), "utf8"));
  if (!manifest || manifest.schema_version !== 1 || !["ready", "skipped"].includes(manifest.status)) {
    throw new Error("Missing successful trusted runtime provisioning manifest");
  }
  if (manifest.status === "ready") {
    checkVersions(manifest.versions);
    for (const key of ["python_executable", "bun_executable"]) {
      if (typeof manifest[key] !== "string" || !path.isAbsolute(manifest[key])) {
        throw new Error(`Trusted ${key} must be an absolute path`);
      }
    }
  }
  return manifest;
}

function pinnedEnvironment(manifest, inherited, actionsDir) {
  const bashEnv = path.join(actionsDir, "tsb_agent_runtime_env.sh");
  if (!fs.statSync(bashEnv).isFile()) throw new Error("Trusted Bash startup environment is missing");
  return {
    ...inherited,
    PATH: [path.dirname(manifest.bun_executable), path.dirname(manifest.python_executable), inherited.PATH || ""].join(path.delimiter),
    PYTHONNOUSERSITE: "1",
    // Noninteractive login shells may reset inherited PATH in /etc/profile.
    // Bash then reads this trusted, read-only file, restoring the pinned bins.
    BASH_ENV: bashEnv,
  };
}

function resolveDefault(command, env) {
  for (const directory of env.PATH.split(path.delimiter)) {
    const candidate = path.join(directory, command);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      if (fs.statSync(candidate).isFile()) return fs.realpathSync(candidate);
    } catch (_) {
      // Continue searching just as executable resolution does.
    }
  }
  throw new Error(`Default ${command} is unavailable`);
}

function checkedCommand(command, args, env, cwd, timeout = 30000) {
  const result = spawnSync(command, args, { env, cwd, encoding: "utf8", timeout, maxBuffer: 1024 * 1024 });
  if (result.error || result.status !== 0) {
    const detail = result.error ? result.error.message : (result.stderr || result.stdout || "").trim().slice(-2000);
    throw new Error(`Runtime command ${path.basename(command)} failed: ${detail || result.status}`);
  }
  return result.stdout.trim();
}

function verifyDefaults(manifest, env, cwd) {
  const python = fs.realpathSync(manifest.python_executable);
  const bun = fs.realpathSync(manifest.bun_executable);
  if (resolveDefault("python3", env) !== python || resolveDefault("python", env) !== python ||
      resolveDefault("bun", env) !== bun) {
    throw new Error("Default executables do not resolve to the trusted pinned tools");
  }
  const probe = "import json,sys,platform,pandas,numpy; print(json.dumps({'executable':sys.executable," +
    "'python':platform.python_version(),'pandas':pandas.__version__,'numpy':numpy.__version__}))";
  const observed = JSON.parse(checkedCommand("python3", ["-I", "-c", probe], env, cwd));
  observed.bun = checkedCommand("bun", ["--version"], env, cwd);
  checkVersions(observed);
  if (fs.realpathSync(observed.executable) !== python || observed.python !== manifest.versions.python) {
    throw new Error("Default Python identity differs from trusted provisioning");
  }
  return observed;
}

async function runStandardHarness(actionsDir, args, env, cwd) {
  // Keep gh-aw's implementation, CLI arguments, retry policy, and output handling.
  const child = spawn(process.execPath, [path.join(actionsDir, "copilot_harness.cjs"), ...args],
    { env, cwd, stdio: "inherit" });
  const handlers = new Map();
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    const handler = () => child.kill(signal);
    handlers.set(signal, handler);
    process.on(signal, handler);
  }
  try {
    return await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => resolve(code === null ? 128 + (constants.signals[signal] || 1) : code));
    });
  } finally {
    for (const [signal, handler] of handlers) process.removeListener(signal, handler);
  }
}

async function main(args = process.argv.slice(2), inherited = process.env, actionsDir = __dirname) {
  try {
    const manifest = readManifest(actionsDir);
    if (!inherited.GITHUB_WORKSPACE || !path.isAbsolute(inherited.GITHUB_WORKSPACE)) {
      throw new Error("An absolute GITHUB_WORKSPACE is required");
    }
    const cwd = inherited.GITHUB_WORKSPACE;
    let env = inherited;
    if (manifest.status === "ready") {
      env = pinnedEnvironment(manifest, inherited, actionsDir);
      const versions = verifyDefaults(manifest, env, cwd);
      const helper = path.join(actionsDir, "tsb_provision_agent_runtime.py");
      const selection = path.join(actionsDir, "tsb_agent_runtime_selection.json");
      const snapshot = JSON.parse(fs.readFileSync(path.join(actionsDir, "tsb_agent_branch_state.json"), "utf8"));
      if (!snapshot || typeof snapshot.branch !== "string" || typeof snapshot.base !== "string") {
        throw new Error("Successful trusted host branch evidence is required");
      }
      // Check age/run/selection, refs and clean history without changing the
      // workspace from which Copilot loads trusted startup instructions.
      console.log(checkedCommand("/bin/bash", [path.join(actionsDir, "sync_automation_branch.sh"),
        snapshot.branch, snapshot.base, selection, "--verify-only"], env, cwd, 60000));
      // Check this unchanged startup checkout. The agent's first command must
      // prepare the branch offline and refresh its dependencies in the sandbox.
      console.log(checkedCommand(manifest.python_executable,
        ["-I", helper, "--selection", selection, "--repo-root", cwd], env, cwd, 660000));
      console.log(checkedCommand(manifest.python_executable,
        ["-I", helper, "--check-only", "--repo-root", cwd], env, cwd));
      // A bounded dependency refresh can outlast the original five-minute
      // snapshot. Recheck it unchanged rather than starting doomed inference.
      console.log(checkedCommand("/bin/bash", [path.join(actionsDir, "sync_automation_branch.sh"),
        snapshot.branch, snapshot.base, selection, "--verify-only"], env, cwd, 60000));
      console.log("[tsb-runtime] " + JSON.stringify({ status: "ready", versions,
        python_executable: manifest.python_executable, bun_executable: manifest.bun_executable }));
    } else {
      // Preserve existing command/unconfigured-program handling without setup.
      console.log("[tsb-runtime] No selected work; runtime checks skipped");
    }
    return await runStandardHarness(actionsDir, args, env, cwd);
  } catch (error) {
    console.error("[tsb-runtime] Startup failed: " + error.message);
    return 1;
  }
}

module.exports = { checkVersions, readManifest, pinnedEnvironment, resolveDefault, verifyDefaults, main };
if (require.main === module) main().then(code => { process.exitCode = code; });
