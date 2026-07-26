import { afterEach, describe, expect, it, vi } from "vitest";

import type { AppState } from "../app-controller";
import { INITIAL_PROGRESS } from "../domain/progress";
import { DEFAULT_SETTINGS } from "../platform/settings";
import { emptyModelTotals } from "../platform/totals-storage";
import type { StatsView } from "./stats-view";
import "./stats-view";

function createState(): AppState {
  const totals = emptyModelTotals();
  totals["bird-classic"] = {
    "near-miss": 900,
    "property-damage": 70,
    "minor-injury": 25,
    "serious-injury": 4,
    fatality: 1,
  };
  const run = {
    id: "latest-retained",
    modelId: "bird-classic" as const,
    createdAt: "2026-07-10T10:00:00.000Z",
    iterations: 100 as const,
    counts: { "near-miss": 90, "property-damage": 10 },
    convergenceScore: 0.8,
  };
  return {
    initialized: true,
    activeModelId: "bird-classic",
    settings: DEFAULT_SETTINGS,
    progress: {
      ...INITIAL_PROGRESS,
      questionsAnswered: 8,
      correctAnswers: 6,
      currentCorrectStreak: 2,
      bestCorrectStreak: 4,
      answeredScenarioIds: ["one", "two", "three", "four", "five"],
    },
    history: [run],
    totals,
    selectedScenario: null,
    latestRun: run,
    running: false,
    persistenceDegraded: false,
  };
}

async function renderStats(): Promise<StatsView> {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => null);
  const view = document.createElement("stats-view") as StatsView;
  view.state = createState();
  document.body.append(view);
  await view.updateComplete;
  return view;
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("stats view data windows", () => {
  it("labels lifetime totals separately from the retained batch count", async () => {
    const view = await renderStats();
    const overview = view.querySelector(".stats-overview")?.textContent?.replace(/\s+/g, " ");

    expect(overview).toContain("Eventos totales");
    expect(overview).toContain("1000");
    expect(overview).toContain("Última convergencia");
    expect(overview).toContain("Lotes retenidos");
    expect(overview).toMatch(/Lotes retenidos\s*1/);
    expect(view.querySelector("#distribution-title")?.textContent).toContain("total histórico");
    expect(view.querySelector(".distribution-list")?.textContent).toMatch(/Cuasi-accidente\s*900/);
  });

  it("explains that the chart uses up to 500 retained recent runs, unlike the lifetime totals", async () => {
    const view = await renderStats();
    const chartSection = view.querySelector('[aria-labelledby="convergence-title"]');
    const text = chartSection?.textContent?.replace(/\s+/g, " ");

    expect(view.querySelector("#convergence-title")?.textContent).toBe(
      "Proporciones observadas recientes",
    );
    expect(text).toContain("lotes recientes retenidos (hasta 500)");
    expect(text).toContain("distribución superior usa el total histórico");
  });

  it("uses the singular event label for a one-event run", async () => {
    const view = await renderStats();
    view.state = {
      ...createState(),
      history: [{ ...createState().history[0]!, iterations: 1 }],
    };
    await view.updateComplete;

    expect(view.querySelector(".history-list")?.textContent?.replace(/\s+/g, " ")).toContain(
      "1 evento",
    );
    expect(view.querySelector(".history-list")?.textContent).not.toContain("1 eventos");
  });

  it("summarizes hazard-question learning separately from simulation totals", async () => {
    const view = await renderStats();
    const learning = view.querySelector('[aria-labelledby="learning-stats-title"]');
    const text = learning?.textContent?.replace(/\s+/g, " ");

    expect(text).toContain("Preguntas respondidas");
    expect(text).toMatch(/Precisión\s*75/);
    expect(text).toMatch(/Mejor racha\s*4/);
    expect(text).toMatch(/Casos explorados\s*5/);
  });
});
