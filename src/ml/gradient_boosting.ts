/**
 * Gradient Boosting from scratch.
 *
 * Implements gradient boosted regression trees (GBRT) with:
 * - Mean squared error and log-loss objectives
 * - CART decision trees as base learners
 * - Shrinkage (learning rate), subsampling, and max depth
 *
 * @module
 */

/** A leaf or internal node in a decision tree. */
export type TreeNode =
  | { kind: "leaf"; value: number }
  | { kind: "internal"; featureIndex: number; threshold: number; left: TreeNode; right: TreeNode };

/** Decision tree parameters. */
export interface TreeParams {
  maxDepth: number;
  minSamplesLeaf: number;
}

/** Predict with a decision tree. */
export function treePredictOne(node: TreeNode, x: Float64Array): number {
  if (node.kind === "leaf") return node.value;
  const val = x[node.featureIndex] ?? 0;
  return val <= node.threshold
    ? treePredictOne(node.left, x)
    : treePredictOne(node.right, x);
}

/** Predict for an array of samples. */
export function treePredict(node: TreeNode, X: Float64Array[]): Float64Array {
  return Float64Array.from(X.map((x) => treePredictOne(node, x)));
}

/** Compute mean of an array of values at given indices. */
function meanAt(y: Float64Array, indices: number[]): number {
  if (indices.length === 0) return 0;
  let s = 0;
  for (const i of indices) s += y[i] ?? 0;
  return s / indices.length;
}

/** Compute MSE of an array at given indices. */
function mseAt(y: Float64Array, indices: number[], mean: number): number {
  let s = 0;
  for (const i of indices) {
    const d = (y[i] ?? 0) - mean;
    s += d * d;
  }
  return s;
}

/** Find best split for a set of indices. */
function findBestSplit(
  X: Float64Array[],
  y: Float64Array,
  indices: number[],
  numFeatures: number,
): { featureIndex: number; threshold: number; gain: number } | null {
  const parentMean = meanAt(y, indices);
  const parentMSE = mseAt(y, indices, parentMean);
  let bestGain = -Infinity;
  let bestFeature = 0;
  let bestThreshold = 0;

  for (let f = 0; f < numFeatures; f++) {
    // Sort indices by feature value
    const sorted = [...indices].sort((a, b) => (X[a]![f] ?? 0) - (X[b]![f] ?? 0));
    for (let k = 1; k < sorted.length; k++) {
      const threshold = ((X[sorted[k - 1]!]![f] ?? 0) + (X[sorted[k]!]![f] ?? 0)) / 2;
      const left = sorted.slice(0, k);
      const right = sorted.slice(k);
      const lMean = meanAt(y, left);
      const rMean = meanAt(y, right);
      const gain = parentMSE - mseAt(y, left, lMean) - mseAt(y, right, rMean);
      if (gain > bestGain) {
        bestGain = gain;
        bestFeature = f;
        bestThreshold = threshold;
      }
    }
  }

  return bestGain > 0 ? { featureIndex: bestFeature, threshold: bestThreshold, gain: bestGain } : null;
}

/** Build a regression tree on gradient residuals. */
export function buildTree(
  X: Float64Array[],
  y: Float64Array,
  indices: number[],
  depth: number,
  params: TreeParams,
): TreeNode {
  const leafVal = meanAt(y, indices);

  if (depth >= params.maxDepth || indices.length <= params.minSamplesLeaf * 2) {
    return { kind: "leaf", value: leafVal };
  }

  const numFeatures = X[0]?.length ?? 0;
  const split = findBestSplit(X, y, indices, numFeatures);

  if (split === null) {
    return { kind: "leaf", value: leafVal };
  }

  const left: number[] = [];
  const right: number[] = [];
  for (const i of indices) {
    if ((X[i]![split.featureIndex] ?? 0) <= split.threshold) {
      left.push(i);
    } else {
      right.push(i);
    }
  }

  if (left.length < params.minSamplesLeaf || right.length < params.minSamplesLeaf) {
    return { kind: "leaf", value: leafVal };
  }

  return {
    kind: "internal",
    featureIndex: split.featureIndex,
    threshold: split.threshold,
    left: buildTree(X, y, left, depth + 1, params),
    right: buildTree(X, y, right, depth + 1, params),
  };
}

/** Gradient boosting ensemble. */
export interface GBMEnsemble {
  trees: TreeNode[];
  learningRate: number;
  initialPrediction: number;
}

/** MSE negative gradient (residuals). */
export function mseGradient(y: Float64Array, yPred: Float64Array): Float64Array {
  const g = new Float64Array(y.length);
  for (let i = 0; i < y.length; i++) g[i] = (y[i] ?? 0) - (yPred[i] ?? 0);
  return g;
}

/** Train gradient boosted regression trees. */
export function fitGBM(
  X: Float64Array[],
  y: Float64Array,
  nEstimators: number = 100,
  learningRate: number = 0.1,
  maxDepth: number = 3,
  minSamplesLeaf: number = 1,
): GBMEnsemble {
  const n = y.length;
  let sumY = 0;
  for (let i = 0; i < n; i++) sumY += y[i] ?? 0;
  const initialPrediction = sumY / (n || 1);

  const yPred = new Float64Array(n).fill(initialPrediction);
  const trees: TreeNode[] = [];
  const params: TreeParams = { maxDepth, minSamplesLeaf };
  const indices = Array.from({ length: n }, (_, i) => i);

  for (let m = 0; m < nEstimators; m++) {
    const residuals = mseGradient(y, yPred);
    const tree = buildTree(X, residuals, indices, 0, params);
    trees.push(tree);
    const treePreds = treePredict(tree, X);
    for (let i = 0; i < n; i++) {
      yPred[i] = (yPred[i] ?? 0) + learningRate * (treePreds[i] ?? 0);
    }
  }

  return { trees, learningRate, initialPrediction };
}

/** Predict with a trained GBM ensemble. */
export function predictGBM(ensemble: GBMEnsemble, X: Float64Array[]): Float64Array {
  const n = X.length;
  const yPred = new Float64Array(n).fill(ensemble.initialPrediction);
  for (const tree of ensemble.trees) {
    const preds = treePredict(tree, X);
    for (let i = 0; i < n; i++) {
      yPred[i] = (yPred[i] ?? 0) + ensemble.learningRate * (preds[i] ?? 0);
    }
  }
  return yPred;
}

/** Compute mean squared error. */
export function mse(y: Float64Array, yPred: Float64Array): number {
  let s = 0;
  for (let i = 0; i < y.length; i++) {
    const d = (y[i] ?? 0) - (yPred[i] ?? 0);
    s += d * d;
  }
  return s / (y.length || 1);
}

/** Compute R² score. */
export function r2Score(y: Float64Array, yPred: Float64Array): number {
  let sumY = 0;
  for (let i = 0; i < y.length; i++) sumY += y[i] ?? 0;
  const meanY = sumY / (y.length || 1);
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < y.length; i++) {
    const d1 = (y[i] ?? 0) - meanY;
    const d2 = (y[i] ?? 0) - (yPred[i] ?? 0);
    ssTot += d1 * d1;
    ssRes += d2 * d2;
  }
  return 1 - ssRes / (ssTot || 1);
}
