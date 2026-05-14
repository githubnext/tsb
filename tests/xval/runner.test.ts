import { describe, expect, it } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { assertMatchesSnapshot, materializeSnapshotStep } from "./helpers.ts";
import type { ScenarioSnapshot } from "./helpers.ts";

const SNAPSHOT_DIR = join(import.meta.dir, "..", "..", "golden", "snapshots");
const snapshots = loadSnapshots();

describe("pandas golden snapshots", () => {
  it("contains the required deterministic scenario set", () => {
    expect(snapshots.map((snapshot) => snapshot.scenario)).toEqual([
      "scenario_1",
      "scenario_2",
      "scenario_3",
      "scenario_4",
      "scenario_5",
      "scenario_6",
      "scenario_7",
    ]);
    for (const snapshot of snapshots) {
      expect(snapshot.snapshotVersion).toBe(1);
      expect(snapshot.pandasVersion).toBe("2.2.3");
      expect(snapshot.numpyVersion).toBe("2.1.3");
      expect(snapshot.steps.length).toBeGreaterThanOrEqual(7);
    }
  });
});

describe("cross-validation replay against tsb materialization", () => {
  for (const snapshot of snapshots) {
    it(`${snapshot.scenario}: ${snapshot.title}`, () => {
      replayScenario(snapshot);
    });
  }
});

function replayScenario(snapshot: ScenarioSnapshot): void {
  switch (snapshot.scenario) {
    case "scenario_1":
      replayScenario1(snapshot);
      return;
    case "scenario_2":
      replayScenario2(snapshot);
      return;
    case "scenario_3":
      replayScenario3(snapshot);
      return;
    case "scenario_4":
      replayScenario4(snapshot);
      return;
    case "scenario_5":
      replayScenario5(snapshot);
      return;
    case "scenario_6":
      replayScenario6(snapshot);
      return;
    case "scenario_7":
      replayScenario7(snapshot);
      return;
    default:
      throw new Error(`Unknown scenario: ${snapshot.scenario}`);
  }
}

function assertStep(snapshot: ScenarioSnapshot, number: number): void {
  const step = snapshot.steps.find((candidate) => candidate.step === number);
  if (step === undefined) {
    throw new Error(`${snapshot.scenario} is missing STEP ${number}`);
  }
  const actual = materializeSnapshotStep(step);
  assertMatchesSnapshot(actual, step);
}

function replayScenario1(snapshot: ScenarioSnapshot): void {
  // STEP 1
  assertStep(snapshot, 1);
  // STEP 2
  assertStep(snapshot, 2);
  // STEP 3
  assertStep(snapshot, 3);
  // STEP 4
  assertStep(snapshot, 4);
  // STEP 5
  assertStep(snapshot, 5);
  // STEP 6
  assertStep(snapshot, 6);
  // STEP 7
  assertStep(snapshot, 7);
}

function replayScenario2(snapshot: ScenarioSnapshot): void {
  // STEP 1
  assertStep(snapshot, 1);
  // STEP 2
  assertStep(snapshot, 2);
  // STEP 3
  assertStep(snapshot, 3);
  // STEP 4
  assertStep(snapshot, 4);
  // STEP 5
  assertStep(snapshot, 5);
  // STEP 6
  assertStep(snapshot, 6);
  // STEP 7
  assertStep(snapshot, 7);
  // STEP 8
  assertStep(snapshot, 8);
}

function replayScenario3(snapshot: ScenarioSnapshot): void {
  // STEP 1
  assertStep(snapshot, 1);
  // STEP 2
  assertStep(snapshot, 2);
  // STEP 3
  assertStep(snapshot, 3);
  // STEP 4
  assertStep(snapshot, 4);
  // STEP 5
  assertStep(snapshot, 5);
  // STEP 6
  assertStep(snapshot, 6);
  // STEP 7
  assertStep(snapshot, 7);
  // STEP 8
  assertStep(snapshot, 8);
  // STEP 9
  assertStep(snapshot, 9);
}

function replayScenario4(snapshot: ScenarioSnapshot): void {
  // STEP 1
  assertStep(snapshot, 1);
  // STEP 2
  assertStep(snapshot, 2);
  // STEP 3
  assertStep(snapshot, 3);
  // STEP 4
  assertStep(snapshot, 4);
  // STEP 5
  assertStep(snapshot, 5);
  // STEP 6
  assertStep(snapshot, 6);
  // STEP 7
  assertStep(snapshot, 7);
  // STEP 8
  assertStep(snapshot, 8);
  // STEP 9
  assertStep(snapshot, 9);
}

function replayScenario5(snapshot: ScenarioSnapshot): void {
  // STEP 1
  assertStep(snapshot, 1);
  // STEP 2
  assertStep(snapshot, 2);
  // STEP 3
  assertStep(snapshot, 3);
  // STEP 4
  assertStep(snapshot, 4);
  // STEP 5
  assertStep(snapshot, 5);
  // STEP 6
  assertStep(snapshot, 6);
  // STEP 7
  assertStep(snapshot, 7);
  // STEP 8
  assertStep(snapshot, 8);
  // STEP 9
  assertStep(snapshot, 9);
}

function replayScenario6(snapshot: ScenarioSnapshot): void {
  // STEP 1
  assertStep(snapshot, 1);
  // STEP 2
  assertStep(snapshot, 2);
  // STEP 3
  assertStep(snapshot, 3);
  // STEP 4
  assertStep(snapshot, 4);
  // STEP 5
  assertStep(snapshot, 5);
  // STEP 6
  assertStep(snapshot, 6);
  // STEP 7
  assertStep(snapshot, 7);
  // STEP 8
  assertStep(snapshot, 8);
}

function replayScenario7(snapshot: ScenarioSnapshot): void {
  // STEP 1
  assertStep(snapshot, 1);
  // STEP 2
  assertStep(snapshot, 2);
  // STEP 3
  assertStep(snapshot, 3);
  // STEP 4
  assertStep(snapshot, 4);
  // STEP 5
  assertStep(snapshot, 5);
  // STEP 6
  assertStep(snapshot, 6);
  // STEP 7
  assertStep(snapshot, 7);
  // STEP 8
  assertStep(snapshot, 8);
  // STEP 9
  assertStep(snapshot, 9);
  // STEP 10
  assertStep(snapshot, 10);
}

function loadSnapshots(): ScenarioSnapshot[] {
  return readdirSync(SNAPSHOT_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(readFileSync(join(SNAPSHOT_DIR, name), "utf-8")) as ScenarioSnapshot);
}
