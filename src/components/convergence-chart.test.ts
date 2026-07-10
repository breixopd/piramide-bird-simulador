import { describe, expect, it, vi } from "vitest";

import { MODELS } from "../domain/models";
import type { SimulationRunSummary } from "../platform/history";
import { buildConvergenceSeries } from "./convergence-chart";
import type { ConvergenceChart } from "./convergence-chart";

const history: readonly SimulationRunSummary[] = [
  {
    id: "newer",
    modelId: "bird-classic",
    createdAt: "2026-07-10T10:01:00.000Z",
    iterations: 100,
    counts: { "near-miss": 100 },
    convergenceScore: 0.8,
  },
  {
    id: "older",
    modelId: "bird-classic",
    createdAt: "2026-07-10T10:00:00.000Z",
    iterations: 100,
    counts: {
      "near-miss": 90,
      "property-damage": 5,
      "minor-injury": 4,
      "serious-injury": 1,
    },
    convergenceScore: 0.7,
  },
];

describe("convergence chart series", () => {
  it("builds cumulative observed and theoretical lines for every level", () => {
    const series = buildConvergenceSeries(history, MODELS["bird-classic"]);

    expect(series.labels).toEqual([100, 200]);
    expect(series.datasets).toHaveLength(8);
    expect(
      series.datasets.find(({ label }) => label === "Cuasi-accidente · observado")?.data,
    ).toEqual([90, 95]);
    expect(
      series.datasets.find(({ label }) => label === "Daño material · observado")?.data,
    ).toEqual([5, 2.5]);
    expect(
      series.datasets.find(({ label }) => label === "Cuasi-accidente · teórico")?.data,
    ).toEqual([expect.closeTo((600 / 641) * 100, 6), expect.closeTo((600 / 641) * 100, 6)]);
  });

  it("ignores executions from the other educational model", () => {
    const extendedRun: SimulationRunSummary = {
      id: "extended",
      modelId: "didactic-extended",
      createdAt: "2026-07-10T10:02:00.000Z",
      iterations: 100,
      counts: { "near-miss": 100 },
      convergenceScore: 0.9,
    };

    expect(
      buildConvergenceSeries([extendedRun, ...history], MODELS["bird-classic"]).labels,
    ).toEqual([100, 200]);
  });

  it("renders a text equivalent for every point and level", async () => {
    const contextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation(() => null);
    const chart = document.createElement("convergence-chart") as ConvergenceChart;
    chart.history = history;
    chart.modelId = "bird-classic";
    document.body.append(chart);
    await chart.updateComplete;

    expect(chart.textContent?.replace(/\s+/g, " ")).toContain(
      "100 eventos: Cuasi-accidente observado 90,0 %, teórico 93,6 %.",
    );
    contextSpy.mockRestore();
  });
});
