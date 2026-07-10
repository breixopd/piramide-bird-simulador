import { describe, expect, it } from "vitest";

import { AppController } from "./app-controller";
import { INITIAL_PROGRESS, type ProgressState } from "./domain/progress";
import type { HistoryRepository, SimulationRunSummary } from "./platform/history";
import { DEFAULT_SETTINGS, type SettingsState } from "./platform/settings";
import { emptyModelTotals, type ModelTotals } from "./platform/totals-storage";

class MemoryHistory implements HistoryRepository {
  runs: SimulationRunSummary[] = [];
  cleared = false;

  async save(run: SimulationRunSummary) {
    this.runs = [run, ...this.runs].slice(0, 500);
  }
  async list() {
    return this.runs;
  }
  async clear() {
    this.cleared = true;
    this.runs = [];
  }
  async close() {}
}

function createController(options?: {
  history?: MemoryHistory;
  progress?: ProgressState;
  settings?: SettingsState;
  totals?: ModelTotals | null;
}) {
  const history = options?.history ?? new MemoryHistory();
  let progress = options?.progress ?? INITIAL_PROGRESS;
  let settings = options?.settings ?? DEFAULT_SETTINGS;
  let totals = options?.totals ?? null;
  const controller = new AppController({
    history,
    loadProgress: async () => progress,
    saveProgress: async (next) => {
      progress = next;
    },
    loadSettings: async () => settings,
    saveSettings: async (next) => {
      settings = next;
    },
    loadTotals: async () => totals,
    saveTotals: async (next) => {
      totals = next;
    },
    now: () => new Date("2026-07-10T10:00:00.000Z"),
    createId: () => "run-1",
  });
  return {
    controller,
    history,
    getProgress: () => progress,
    getSettings: () => settings,
    getTotals: () => totals,
  };
}

describe("AppController", () => {
  it("reconstructs separate totals for both models from history", async () => {
    const history = new MemoryHistory();
    history.runs = [
      {
        id: "classic",
        modelId: "bird-classic",
        createdAt: "2026-07-10T09:00:00.000Z",
        iterations: 1,
        counts: { "near-miss": 1 },
        convergenceScore: 0.9,
      },
      {
        id: "extended",
        modelId: "didactic-extended",
        createdAt: "2026-07-10T08:00:00.000Z",
        iterations: 100,
        counts: { fatality: 1, "near-miss": 99 },
        convergenceScore: 0.95,
      },
    ];
    const { controller } = createController({ history });

    await controller.initialize();

    expect(controller.state.totals["bird-classic"]["near-miss"]).toBe(1);
    expect(controller.state.totals["didactic-extended"].fatality).toBe(1);
  });

  it("executes, persists and exposes a deterministic run", async () => {
    const { controller, history, getProgress } = createController();
    await controller.initialize();

    const run = await controller.run(1, () => 0);

    expect(run.id).toBe("run-1");
    expect(run.counts).toEqual({ "near-miss": 1 });
    expect(history.runs).toHaveLength(1);
    expect(controller.state.selectedScenario?.outcome).toBe("near-miss");
    expect(getProgress().unlocked).toContain("first-simulation");
  });

  it("uses persisted lifetime totals instead of the capped history window", async () => {
    const totals = emptyModelTotals();
    totals["bird-classic"]["near-miss"] = 10_000;
    const history = new MemoryHistory();
    history.runs = [
      {
        id: "latest",
        modelId: "bird-classic",
        createdAt: "2026-07-10T09:00:00.000Z",
        iterations: 1,
        counts: { "near-miss": 1 },
        convergenceScore: 0.9,
      },
    ];
    const { controller } = createController({ history, totals });

    await controller.initialize();

    expect(controller.state.totals["bird-classic"]["near-miss"]).toBe(10_000);
  });

  it("coalesces rapid duplicate run requests into one persisted execution", async () => {
    const { controller, history } = createController();
    await controller.initialize();

    const first = controller.run(1000, () => 0);
    const second = controller.run(1000, () => 0.99);

    expect(first).toBe(second);
    await first;
    expect(history.runs).toHaveLength(1);
  });

  it("starts in an in-memory degraded mode when local persistence is unavailable", async () => {
    const failure = async () => {
      throw new Error("Storage unavailable");
    };
    const controller = new AppController({
      history: {
        save: failure,
        list: failure,
        clear: failure,
        close: async () => undefined,
      },
      loadProgress: failure,
      saveProgress: failure,
      loadSettings: failure,
      saveSettings: failure,
      loadTotals: failure,
      saveTotals: failure,
    });

    await expect(controller.initialize()).resolves.toBeUndefined();
    expect(controller.state.initialized).toBe(true);
    expect(controller.state.persistenceDegraded).toBe(true);
    await expect(controller.run(1, () => 0)).resolves.toBeDefined();
  });

  it("resets statistics and history but preserves settings and achievements", async () => {
    const progress: ProgressState = {
      unlocked: ["first-simulation"],
      currentNearMissStreak: 2,
      bestNearMissStreak: 8,
    };
    const { controller, history, getProgress, getSettings } = createController({ progress });
    await controller.initialize();
    await controller.run(1, () => 0);

    await controller.resetStatistics();

    expect(history.cleared).toBe(true);
    expect(controller.state.history).toEqual([]);
    expect(controller.state.totals["bird-classic"]).toEqual({});
    expect(getProgress().unlocked).toContain("first-simulation");
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps visible statistics and reports failure when reset persistence is incomplete", async () => {
    const { controller, history } = createController();
    await controller.initialize();
    await controller.run(1, () => 0);
    history.clear = async () => {
      throw new Error("IndexedDB unavailable");
    };

    await expect(controller.resetStatistics()).resolves.toBe(false);
    expect(controller.state.history).toHaveLength(1);
    expect(controller.state.totals["bird-classic"]["near-miss"]).toBe(1);
    expect(controller.state.persistenceDegraded).toBe(true);
  });
});
