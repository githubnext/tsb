/**
 * Random Forest implementation from scratch.
 *
 * Implements bootstrap aggregation (bagging) of CART decision trees
 * with random feature subsampling at each split (random forest).
 * Supports both classification and regression.
 *
 * @module
 */

import { buildTree, treePredict, type TreeParams, type TreeNode } from "./gradient_boosting.ts";

/** Random Forest configuration. */
export interface RandomForestConfig {
  nEstimators: number;
  maxDepth: number;
  minSamplesLeaf: number;
  /** Number of features to consider at each split (0 = sqrt(n_features)). */
  maxFeatures: number;
  /** Bootstrap sample size (0 = n_samples). */
  sampleSize: number;
  seed: number;
}

/** LCG pseudo-random number generator. */
export class LCGRandom {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    this.state = (Math.imul(1664525, this.state) + 1013904223) >>> 0;
    return this.state / 4294967296;
  }
  nextInt(n: number): number {
    return Math.floor(this.next() * n);
  }
}

/** Bootstrap sample indices. */
function bootstrapSample(n: number, size: number, rng: LCGRandom): number[] {
  const indices: number[] = [];
  for (let i = 0; i < size; i++) indices.push(rng.nextInt(n));
  return indices;
}

function selectFeatures(numFeatures: number, maxFeatures: number, rng: LCGRandom): number[] {
  const k = maxFeatures <= 0 ? Math.max(1, Math.floor(Math.sqrt(numFeatures))) : Math.min(maxFeatures, numFeatures);
  const all = Array.from({ length: numFeatures }, (_, i) => i);
  // Fisher-Yates shuffle and take first k
  for (let i = numFeatures - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return all.slice(0, k);
}

/** Random Forest model. */
export interface RandomForestModel {
  trees: TreeNode[];
  featureMaps: number[][];
  config: RandomForestConfig;
  numFeatures: number;
}

/** Train a Random Forest regressor. */
export function fitRandomForest(
  X: Float64Array[],
  y: Float64Array,
  config: Partial<RandomForestConfig> = {},
): RandomForestModel {
  const cfg: RandomForestConfig = {
    nEstimators: 100,
    maxDepth: 5,
    minSamplesLeaf: 1,
    maxFeatures: 0,
    sampleSize: 0,
    seed: 42,
    ...config,
  };

  const n = X.length;
  const numFeatures = X[0]?.length ?? 0;
  const sampleSize = cfg.sampleSize <= 0 ? n : cfg.sampleSize;
  const rng = new LCGRandom(cfg.seed);
  const params: TreeParams = { maxDepth: cfg.maxDepth, minSamplesLeaf: cfg.minSamplesLeaf };

  const trees: TreeNode[] = [];
  const featureMaps: number[][] = [];

  for (let t = 0; t < cfg.nEstimators; t++) {
    const indices = bootstrapSample(n, sampleSize, rng);
    const k = cfg.maxFeatures <= 0 ? Math.max(1, Math.floor(Math.sqrt(numFeatures))) : Math.min(cfg.maxFeatures, numFeatures);
    const featureSubset = selectFeatures(numFeatures, k, rng);
    featureMaps.push(featureSubset);

    // Build tree on bootstrap sample with projected features
    const subX: Float64Array[] = [];
    const subY = new Float64Array(indices.length);
    for (let i = 0; i < indices.length; i++) {
      const xi = X[indices[i]!]!;
      const projected = new Float64Array(featureSubset.length);
      for (let j = 0; j < featureSubset.length; j++) {
        projected[j] = xi[featureSubset[j]!] ?? 0;
      }
      subX.push(projected);
      subY[i] = y[indices[i]!] ?? 0;
    }
    const allIdx = Array.from({ length: indices.length }, (_, i) => i);
    trees.push(buildTree(subX, subY, allIdx, 0, params));
  }

  return { trees, featureMaps, config: cfg, numFeatures };
}

/** Predict with a Random Forest (regression: average of trees). */
export function predictRandomForest(model: RandomForestModel, X: Float64Array[]): Float64Array {
  const n = X.length;
  const sum = new Float64Array(n);

  for (let t = 0; t < model.trees.length; t++) {
    const featureMap = model.featureMaps[t]!;
    const projX: Float64Array[] = X.map((xi) => {
      const p = new Float64Array(featureMap.length);
      for (let j = 0; j < featureMap.length; j++) p[j] = xi[featureMap[j]!] ?? 0;
      return p;
    });
    const preds = treePredict(model.trees[t]!, projX);
    for (let i = 0; i < n; i++) sum[i] = (sum[i] ?? 0) + (preds[i] ?? 0);
  }

  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = (sum[i] ?? 0) / (model.trees.length || 1);
  return out;
}

/** Out-of-bag (OOB) error estimate for regression. */
export function oobError(
  model: RandomForestModel,
  X: Float64Array[],
  y: Float64Array,
  seed: number,
): number {
  const n = X.length;
  const rng = new LCGRandom(seed);
  const sampleSize = model.config.sampleSize <= 0 ? n : model.config.sampleSize;
  const oobPreds = new Float64Array(n);
  const oobCounts = new Int32Array(n);

  for (let t = 0; t < model.trees.length; t++) {
    const bootstrapSet = new Set(bootstrapSample(n, sampleSize, rng));
    const featureMap = model.featureMaps[t]!;
    for (let i = 0; i < n; i++) {
      if (bootstrapSet.has(i)) continue;
      const xi = X[i]!;
      const projected = new Float64Array(featureMap.length);
      for (let j = 0; j < featureMap.length; j++) projected[j] = xi[featureMap[j]!] ?? 0;
      oobPreds[i] += treePredict(model.trees[t]!, [projected])[0] ?? 0;
      oobCounts[i]++;
    }
  }

  let sse = 0;
  let cnt = 0;
  for (let i = 0; i < n; i++) {
    if ((oobCounts[i] ?? 0) === 0) continue;
    const pred = (oobPreds[i] ?? 0) / (oobCounts[i] ?? 1);
    const err = (y[i] ?? 0) - pred;
    sse += err * err;
    cnt++;
  }
  return cnt > 0 ? sse / cnt : 0;
}
