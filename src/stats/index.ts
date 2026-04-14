/**
 * tsb/stats — statistical functions.
 *
 * @module
 */

export {
  cummax,
  cummin,
  cumprod,
  cumsum,
  dataFrameCummax,
  dataFrameCummin,
  dataFrameCumprod,
  dataFrameCumsum,
} from "./cum_ops.ts";
export type { CumOpsOptions, DataFrameCumOpsOptions } from "./cum_ops.ts";
export {
  clip,
  dataFrameClip,
  dataFrameAbs,
  dataFrameRound,
  seriesAbs,
  seriesRound,
} from "./elem_ops.ts";
export type { ClipOptions, RoundOptions, DataFrameElemOptions } from "./elem_ops.ts";
export { valueCounts, dataFrameValueCounts } from "./value_counts.ts";
export type { ValueCountsOptions, DataFrameValueCountsOptions } from "./value_counts.ts";
export { describe, quantile } from "./describe.ts";
export type { DescribeOptions } from "./describe.ts";
export { pearsonCorr, dataFrameCorr, dataFrameCov } from "./corr.ts";
export type { CorrMethod, CorrOptions, CovOptions } from "./corr.ts";
export { rankSeries, rankDataFrame } from "./rank.ts";
export type { RankMethod, NaOption, RankOptions } from "./rank.ts";
export {
  nlargestSeries,
  nsmallestSeries,
  nlargestDataFrame,
  nsmallestDataFrame,
} from "./nlargest.ts";
export type { NKeep, NTopOptions, NTopDataFrameOptions } from "./nlargest.ts";
export { rollingSem, rollingSkew, rollingKurt, rollingQuantile } from "./window_extended.ts";
export type { WindowExtOptions, RollingQuantileOptions } from "./window_extended.ts";
export { seriesWhere, seriesMask, dataFrameWhere, dataFrameMask } from "./where_mask.ts";
export type {
  SeriesCond,
  DataFrameCond,
  SeriesWhereOptions,
  DataFrameWhereOptions,
} from "./where_mask.ts";
export {
  isna,
  notna,
  isnull,
  notnull,
  ffillSeries,
  bfillSeries,
  dataFrameFfill,
  dataFrameBfill,
} from "./na_ops.ts";
export type { FillDirectionOptions, DataFrameFillOptions } from "./na_ops.ts";
export { fillna, dropna, countna, countValid } from "./notna_isna.ts";
export type { IsnaInput, FillnaOptions, DropnaOptions } from "./notna_isna.ts";
export { pctChangeSeries, pctChangeDataFrame } from "./pct_change.ts";
export type {
  PctChangeFillMethod,
  PctChangeOptions,
  DataFramePctChangeOptions,
} from "./pct_change.ts";
export { idxminSeries, idxmaxSeries, idxminDataFrame, idxmaxDataFrame } from "./idxmin_idxmax.ts";
export type { IdxOptions, IdxDataFrameOptions } from "./idxmin_idxmax.ts";
export { replaceSeries, replaceDataFrame } from "./replace.ts";
export type {
  ReplaceMapping,
  ReplaceSpec,
  ReplaceOptions,
  DataFrameReplaceOptions,
} from "./replace.ts";
export { diffSeries, diffDataFrame, shiftSeries, shiftDataFrame } from "./diff_shift.ts";
export type {
  DiffOptions,
  DataFrameDiffOptions,
  ShiftOptions,
  DataFrameShiftOptions,
} from "./diff_shift.ts";
export {
  duplicatedSeries,
  duplicatedDataFrame,
  dropDuplicatesSeries,
  dropDuplicatesDataFrame,
} from "./duplicated.ts";
export type { KeepPolicy, DuplicatedOptions, DataFrameDuplicatedOptions } from "./duplicated.ts";
export { clipAdvancedSeries, clipAdvancedDataFrame } from "./clip_advanced.ts";
export type {
  SeriesBound,
  DataFrameBound,
  ClipAdvancedSeriesOptions,
  ClipAdvancedDataFrameOptions,
} from "./clip_advanced.ts";
export {
  applySeries,
  mapSeries,
  applyDataFrame,
  applyExpandDataFrame,
  mapDataFrame,
} from "./apply.ts";
export type {
  MapLookup,
  ApplyDataFrameOptions,
  ApplyExpandDataFrameOptions,
} from "./apply.ts";
export { cut, qcut, cutCodes, cutCategories } from "./cut.ts";
export type {
  CutOptions,
  QcutOptions,
  CutResult,
  CutResultWithBins,
} from "./cut.ts";
export { Interval, IntervalIndex, intervalRange } from "./interval.ts";
export type { ClosedType, IntervalOptions, IntervalRangeOptions } from "./interval.ts";
export { getDummies, getDummiesSeries, getDummiesDataFrame, fromDummies } from "./get_dummies.ts";
export type { GetDummiesOptions, FromDummiesOptions } from "./get_dummies.ts";
export {
  strNormalize,
  strGetDummies,
  strExtractAll,
  strRemovePrefix,
  strRemoveSuffix,
  strTranslate,
  strCharWidth,
  strByteLength,
} from "./string_ops.ts";
export type {
  NormalizeForm,
  StrInput,
  GetDummiesOptions as StrGetDummiesOptions,
  ExtractAllOptions,
} from "./string_ops.ts";
export {
  strSplitExpand,
  strExtractGroups,
  strPartition,
  strRPartition,
  strMultiReplace,
  strIndent,
  strDedent,
} from "./string_ops_extended.ts";
export type {
  SplitExpandOptions,
  ExtractGroupsOptions,
  PartitionResult,
  ReplacePair,
  IndentOptions,
} from "./string_ops_extended.ts";
export {
  digitize,
  histogram,
  linspace,
  arange,
  percentileOfScore,
  zscore,
  minMaxNormalize,
  coefficientOfVariation,
  seriesDigitize,
} from "./numeric_extended.ts";
export type {
  HistogramOptions,
  HistogramResult,
  ZscoreOptions,
  MinMaxOptions,
  CvOptions,
} from "./numeric_extended.ts";
export {
  catFromCodes,
  catUnionCategories,
  catIntersectCategories,
  catDiffCategories,
  catEqualCategories,
  catSortByFreq,
  catToOrdinal,
  catFreqTable,
  catCrossTab,
  catRecode,
} from "./categorical_ops.ts";
export type {
  CatFromCodesOptions,
  CatSortByFreqOptions,
  CatCrossTabOptions,
} from "./categorical_ops.ts";
export {
  formatFloat,
  formatPercent,
  formatScientific,
  formatEngineering,
  formatThousands,
  formatCurrency,
  formatCompact,
  makeFloatFormatter,
  makePercentFormatter,
  makeCurrencyFormatter,
  applySeriesFormatter,
  applyDataFrameFormatter,
  seriesToString,
  dataFrameToString,
} from "./format_ops.ts";
export type {
  Formatter,
  SeriesToStringOptions,
  DataFrameToStringOptions,
} from "./format_ops.ts";
