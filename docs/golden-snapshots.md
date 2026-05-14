# Golden snapshot format

`golden/generate.py` runs the pandas side of the cross-validation scenarios and
writes deterministic JSON snapshots to `golden/snapshots/`.

Each snapshot contains:

- `snapshotVersion`, `scenario`, `title`, `pandasVersion`, and `numpyVersion`
- `steps`: one entry for every `# STEP N` checkpoint in the scenario
- for DataFrames: `data` as row-major values, `index`, `columns`, `dtypes`, and `shape`
- for Series: `data`, `index`, `dtype`, `name`, and `shape`
- `categoricals` metadata for categorical columns: categories, codes, and ordered flag

Missing values (`NaN`, `NaT`, `None`) are encoded as `{ "kind": "NaN" }` so JSON
remains strict while TypeScript comparisons can treat missing values as equal.
Floating-point comparisons in `tests/xval/helpers.ts` use an absolute tolerance of
`1e-10`; integer, boolean, string, categorical metadata, index labels, and column
order are compared exactly.

To add a new scenario, add a function in `golden/generate.py`, call
`ScenarioRecorder.step()` after each pandas operation, append it to `SCENARIOS`,
regenerate snapshots with pinned pandas/numpy, and add corresponding `// STEP N`
assertions in `tests/xval/runner.test.ts`.
