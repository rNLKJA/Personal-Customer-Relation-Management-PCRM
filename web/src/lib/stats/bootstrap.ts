import { mulberry32 } from "../random";

/**
 * Descriptive helpers and the percentile bootstrap. Every resampling run takes
 * an explicit integer seed (mulberry32), so a chart or table regenerates the
 * same interval every time and the seed can be printed next to it.
 */

export const DEFAULT_BOOTSTRAP_RESAMPLES = 2000;
export const DEFAULT_SEED = 4399;
/** Below this many observations a percentile interval is not reported as a 95% CI. */
export const MIN_BOOTSTRAP_N = 5;

export function mean(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

/**
 * Sample quantile, R type 7 / numpy's default "linear" method:
 * h = (n - 1) p, interpolate between the floor and ceiling order statistics.
 */
export function quantile(values: readonly number[], p: number): number {
  if (values.length === 0) return Number.NaN;
  if (p < 0 || p > 1) throw new RangeError("p must be in [0, 1]");
  const sorted = [...values].sort((a, b) => a - b);
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

export interface BootstrapResult {
  estimate: number;
  lower: number;
  upper: number;
  confidence: number;
  resamples: number;
  seed: number;
  n: number;
  /**
   * True when the interval should not be presented as a confidence interval:
   * fewer than MIN_BOOTSTRAP_N observations, or every replicate was the same
   * (e.g. 14 notes all scoring 100% give a zero-width "100-100%" interval,
   * which says nothing about uncertainty). Show "no interval" instead.
   */
  degenerate: boolean;
}

export interface BootstrapOptions {
  resamples?: number;
  seed?: number;
  confidence?: number;
}

/**
 * Percentile bootstrap confidence interval for `statistic` (default: the mean).
 * Resamples `values` with replacement `resamples` times and takes the
 * (1 - confidence) / 2 and (1 + confidence) / 2 quantiles of the replicates.
 *
 * Caveats (stated wherever this is shown): the percentile interval assumes the
 * observations are exchangeable and under-covers for small n; it is a
 * description of sampling variability, not a forecast.
 */
export function bootstrapCI(
  values: readonly number[],
  statistic: (sample: readonly number[]) => number = mean,
  {
    resamples = DEFAULT_BOOTSTRAP_RESAMPLES,
    seed = DEFAULT_SEED,
    confidence = 0.95,
  }: BootstrapOptions = {},
): BootstrapResult | null {
  const n = values.length;
  if (n === 0) return null;
  const rng = mulberry32(seed);
  const replicates = new Array<number>(resamples);
  const sample = new Array<number>(n);
  for (let b = 0; b < resamples; b++) {
    for (let i = 0; i < n; i++) sample[i] = values[Math.floor(rng() * n)];
    replicates[b] = statistic(sample);
  }
  const alpha = (1 - confidence) / 2;
  const lower = quantile(replicates, alpha);
  const upper = quantile(replicates, 1 - alpha);
  return {
    estimate: statistic(values),
    lower,
    upper,
    confidence,
    resamples,
    seed,
    n,
    degenerate: n < MIN_BOOTSTRAP_N || lower === upper,
  };
}

/**
 * Paired comparison: bootstrap CI of the mean difference `a[i] - b[i]`
 * (resampling pairs, so the within-item correlation is kept).
 */
export function pairedBootstrapCI(
  a: readonly number[],
  b: readonly number[],
  options: BootstrapOptions = {},
): BootstrapResult | null {
  if (a.length !== b.length) throw new RangeError("paired samples must have the same length");
  return bootstrapCI(
    a.map((x, i) => x - b[i]),
    mean,
    options,
  );
}
