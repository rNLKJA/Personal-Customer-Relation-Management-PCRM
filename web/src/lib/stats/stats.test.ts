import { describe, expect, it } from "vitest";
import {
  bootstrapCI,
  mean,
  normalQuantile,
  pairedBootstrapCI,
  quantile,
  signTestPValue,
  wilsonInterval,
  zForConfidence,
} from ".";

/**
 * Reference values from `uv run scripts/stats_reference.py` (scipy 1.x) and
 * cross-checked in R (qnorm, prop.test(correct = FALSE), quantile(type = 7),
 * binom.test). See that script for the exact calls.
 */

describe("normalQuantile (AS 241)", () => {
  const ref: [number, number][] = [
    [0.5, 0],
    [0.9, 1.2815515655446004],
    [0.975, 1.959963984540054],
    [0.995, 2.5758293035489004],
    [0.001, -3.090232306167813],
    [1e-10, -6.361340902404056],
    [0.02425, -1.972961051311885],
    [0.97575, 1.972961051311885],
  ];
  it.each(ref)("matches scipy norm.ppf(%s)", (p, z) => {
    expect(normalQuantile(p)).toBeCloseTo(z, 12);
  });

  it("handles the edges", () => {
    expect(normalQuantile(0)).toBe(-Infinity);
    expect(normalQuantile(1)).toBe(Infinity);
    expect(normalQuantile(1.5)).toBeNaN();
    expect(zForConfidence(0.95)).toBeCloseTo(1.959963984540054, 12);
  });
});

describe("wilsonInterval", () => {
  const ref: [number, number, number, number, number][] = [
    [0, 10, 0.95, 0.0, 0.27753279986288926],
    [3, 10, 0.95, 0.10779126740630102, 0.6032218525388546],
    [10, 10, 0.95, 0.7224672001371109, 1.0],
    [36, 40, 0.95, 0.769482247724777, 0.9604204713173935],
    [1, 1000, 0.95, 0.00017654637062607809, 0.0056425585979579355],
    [7, 20, 0.9, 0.20226004005676104, 0.5334873111515284],
    [50, 100, 0.99, 0.37527962504483986, 0.6247203749551602],
  ];
  it.each(ref)("%i/%i at %s matches scipy / R prop.test", (x, n, conf, lo, hi) => {
    const ci = wilsonInterval(x, n, conf)!;
    expect(ci.estimate).toBeCloseTo(x / n, 15);
    expect(ci.lower).toBeCloseTo(lo, 10);
    expect(ci.upper).toBeCloseTo(hi, 10);
  });

  it("returns null without data and rejects impossible counts", () => {
    expect(wilsonInterval(0, 0)).toBeNull();
    expect(() => wilsonInterval(11, 10)).toThrow(RangeError);
  });
});

describe("signTestPValue (exact binomial, p = 0.5)", () => {
  const ref: [number, number, number][] = [
    [8, 12, 0.3876953125],
    [3, 15, 0.03515625],
    [0, 5, 0.0625],
    [6, 12, 1.0],
    [10, 10, 0.001953125],
    [11, 16, 0.210113525390625],
  ];
  it.each(ref)("%i of %i matches scipy binomtest / R binom.test", (k, n, p) => {
    expect(signTestPValue(k, n)).toBeCloseTo(p, 12);
  });
  it("is 1 with no informative pairs", () => {
    expect(signTestPValue(0, 0)).toBe(1);
  });
});

describe("quantile (type 7)", () => {
  const data = [2, 0, 1, 3, 1, 0, 2, 4, 1, 1, 0, 2];
  const ref: [number, number][] = [
    [0, 0],
    [0.025, 0],
    [0.25, 0.75],
    [0.5, 1],
    [0.9, 2.9],
    [0.975, 3.725],
    [1, 4],
  ];
  it.each(ref)("p = %s matches numpy.quantile / R type 7", (p, q) => {
    expect(quantile(data, p)).toBeCloseTo(q, 12);
  });
  it("does not mutate its input", () => {
    const copy = [...data];
    quantile(data, 0.5);
    expect(data).toEqual(copy);
  });
});

describe("bootstrapCI (percentile)", () => {
  const data = [2, 0, 1, 3, 1, 0, 2, 4, 1, 1, 0, 2];

  it("is reproducible for a fixed seed and changes with the seed", () => {
    const a = bootstrapCI(data, mean, { seed: 7, resamples: 500 })!;
    const b = bootstrapCI(data, mean, { seed: 7, resamples: 500 })!;
    const c = bootstrapCI(data, mean, { seed: 8, resamples: 500 })!;
    expect(a).toEqual(b);
    expect([c.lower, c.upper]).not.toEqual([a.lower, a.upper]);
    expect(a).toMatchObject({ seed: 7, resamples: 500, n: 12, confidence: 0.95 });
  });

  it("agrees with scipy.stats.bootstrap(method='percentile') within Monte Carlo error", () => {
    // scipy, 200 000 resamples: [0.75, 2.0833]. Means of 12 integers move in
    // steps of 1/12, so allow one step.
    const ci = bootstrapCI(data, mean, { seed: 4399, resamples: 20000 })!;
    expect(ci.estimate).toBeCloseTo(17 / 12, 12);
    expect(Math.abs(ci.lower - 0.75)).toBeLessThanOrEqual(1 / 12 + 1e-9);
    expect(Math.abs(ci.upper - 2.0833333333333335)).toBeLessThanOrEqual(1 / 12 + 1e-9);
  });

  it("collapses to a point for a constant sample and returns null when empty", () => {
    const ci = bootstrapCI([3, 3, 3, 3])!;
    expect([ci.lower, ci.estimate, ci.upper]).toEqual([3, 3, 3]);
    expect(bootstrapCI([])).toBeNull();
  });

  it("covers the true mean about 95% of the time on simulated Poisson-like data", () => {
    // Coarse coverage check: 200 samples of n = 30 from a known distribution.
    let covered = 0;
    let s = 1;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let rep = 0; rep < 200; rep++) {
      const sample = Array.from({ length: 30 }, () => Math.floor(rand() * 5)); // uniform 0..4, mean 2
      const ci = bootstrapCI(sample, mean, { seed: rep + 1, resamples: 400 })!;
      if (ci.lower <= 2 && 2 <= ci.upper) covered++;
    }
    expect(covered / 200).toBeGreaterThan(0.88);
    expect(covered / 200).toBeLessThan(0.99);
  });
});

describe("pairedBootstrapCI", () => {
  it("matches scipy on paired differences within Monte Carlo error", () => {
    const a = [0.5, 0.75, 1.0, 0.5, 0.25, 1.0, 0.75, 0.5, 1.0, 0.5];
    const b = [0.25, 0.5, 1.0, 0.25, 0.25, 0.5, 0.5, 0.5, 0.75, 0.0];
    const ci = pairedBootstrapCI(a, b, { resamples: 20000, seed: 1 })!;
    expect(ci.estimate).toBeCloseTo(0.225, 12);
    expect(Math.abs(ci.lower - 0.125)).toBeLessThanOrEqual(0.0251);
    expect(Math.abs(ci.upper - 0.325)).toBeLessThanOrEqual(0.0251);
  });
  it("rejects unequal lengths", () => {
    expect(() => pairedBootstrapCI([1], [1, 2])).toThrow(RangeError);
  });
});
