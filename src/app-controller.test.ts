import { describe, expect, it } from "vitest";

import { AppController } from "./app-controller";
import { INITIAL_PROGRESS, type ProgressState } from "./domain/progress";
import type {
  HistoryRepository,
  SimulationRunSummary,
  SimulationSnapshot,
} from "./platform/history";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type KeyValuePort,
  type SettingsState,
} from "./platform/settings";
import { emptyModelTotals, type ModelTotals } from "./platform/totals-storage";

class MemoryHistory implements HistoryRepository {
  runs: SimulationRunSummary[] = [];
  snapshot: SimulationSnapshot | null = null;
  cleared = false;

  async save(run: SimulationRunSummary, snapshot: SimulationSnapshot) {
    this.runs = [run, ...this.runs].slice(0, 500);
    this.snapshot = snapshot;
  }
  async list() {
    return this.runs;
  }
  async loadSnapshot() {
    return this.snapshot;
  }
  async saveSnapshot(snapshot: SimulationSnapshot) {
    this.snapshot = snapshot;
  }
  async clear(snapshot: SimulationSnapshot) {
    this.cleared = true;
    this.runs = [];
    this.snapshot = snapshot;
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
  let settings = options?.settings ?? DEFAULT_SETTINGS;
  if (options?.progress !== undefined || options?.totals !== undefined) {
    history.snapshot = {
      progress: options.progress ?? INITIAL_PROGRESS,
      totals: options.totals ?? emptyModelTotals(),
    };
  }
  const controller = new AppController({
    history,
    loadSettings: async () => settings,
    saveSettings: async (next) => {
      settings = next;
    },
    now: () => new Date("2026-07-10T10:00:00.000Z"),
    createId: () => "run-1",
  });
  return {
    controller,
    history,
    getProgress: () => history.snapshot?.progress ?? INITIAL_PROGRESS,
    getSettings: () => settings,
    getTotals: () => history.snapshot?.totals ?? null,
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

  it("records one persisted learning answer for the active run", async () => {
    const { controller, history } = createController();
    await controller.initialize();
    const run = await controller.run(1, () => 0);
    const scenario = controller.state.selectedScenario;
    if (!scenario) throw new Error("Expected a selected scenario");

    await expect(
      controller.recordLearningAnswer({
        runId: run.id,
        scenarioId: scenario.id,
        correct: true,
      }),
    ).resolves.toBe(true);
    await expect(
      controller.recordLearningAnswer({
        runId: run.id,
        scenarioId: scenario.id,
        correct: false,
      }),
    ).resolves.toBe(false);

    expect(controller.state.progress.questionsAnswered).toBe(1);
    expect(controller.state.progress.correctAnswers).toBe(1);
    expect(history.snapshot?.progress.unlocked).toContain("hazard-spotter");
  });

  it("keeps a learning answer when another simulation is launched while it saves", async () => {
    const history = new MemoryHistory();
    const { controller } = createController({ history });
    await controller.initialize();
    const firstRun = await controller.run(1, () => 0);
    const scenario = controller.state.selectedScenario;
    if (!scenario) throw new Error("Expected a selected scenario");

    let releaseSnapshot!: () => void;
    const snapshotGate = new Promise<void>((resolve) => {
      releaseSnapshot = resolve;
    });
    const saveSnapshot = history.saveSnapshot.bind(history);
    history.saveSnapshot = async (snapshot) => {
      await snapshotGate;
      await saveSnapshot(snapshot);
    };

    const answer = controller.recordLearningAnswer({
      runId: firstRun.id,
      scenarioId: scenario.id,
      correct: true,
    });
    const secondRun = controller.run(1, () => 0);

    expect(controller.state.progress.correctAnswers).toBe(1);
    expect(controller.state.running).toBe(true);
    releaseSnapshot();
    await Promise.all([answer, secondRun]);

    expect(history.snapshot?.progress.correctAnswers).toBe(1);
    expect(history.snapshot?.totals["bird-classic"]["near-miss"]).toBe(2);
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

  it("reports batch convergence separately from cumulative convergence", async () => {
    const totals = emptyModelTotals();
    totals["bird-classic"] = {
      "near-miss": 60_000,
      "property-damage": 3_000,
      "minor-injury": 1_000,
      "serious-injury": 100,
    };
    const { controller } = createController({ totals });
    await controller.initialize();

    const run = await controller.run(1, () => 640 / 641);

    expect(run.convergenceScore).toBeGreaterThan(0.99);
    expect(run).toHaveProperty("batchConvergenceScore");
    expect(
      (run as SimulationRunSummary & { readonly batchConvergenceScore: number })
        .batchConvergenceScore,
    ).toBeCloseTo(1 / 641, 10);
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
        loadSnapshot: failure,
        saveSnapshot: failure,
        clear: failure,
        close: async () => undefined,
      },
      loadSettings: failure,
      saveSettings: failure,
    });

    await expect(controller.initialize()).resolves.toBeUndefined();
    expect(controller.state.initialized).toBe(true);
    expect(controller.state.persistenceDegraded).toBe(true);
    await expect(controller.run(1, () => 0)).resolves.toBeDefined();
  });

  it("does not leave partial history, totals or progress after an atomic save fails", async () => {
    const history = new MemoryHistory();
    const { controller } = createController({ history });
    await controller.initialize();
    const persist = history.save.bind(history);
    let shouldFail = true;
    history.save = async (run, snapshot) => {
      if (shouldFail) {
        shouldFail = false;
        throw new Error("IndexedDB transaction aborted");
      }
      await persist(run, snapshot);
    };

    await controller.run(1, () => 0);

    expect(controller.state.latestRun).not.toBeNull();
    expect(controller.state.history).toEqual([]);
    expect(controller.state.totals["bird-classic"]).toEqual({});
    expect(controller.state.progress).toEqual(INITIAL_PROGRESS);
    expect(controller.state.persistenceDegraded).toBe(true);

    await controller.run(1, () => 0);
    expect(controller.state.history).toHaveLength(1);
    expect(controller.state.totals["bird-classic"]["near-miss"]).toBe(1);
    expect(controller.state.progress.unlocked).toContain("first-simulation");

    const resumed = createController({ history }).controller;
    await resumed.initialize();
    expect(resumed.state.history).toHaveLength(1);
    expect(resumed.state.totals["bird-classic"]["near-miss"]).toBe(1);
    expect(resumed.state.progress.unlocked).toContain("first-simulation");
  });

  it("never overwrites a valid snapshot after a transient snapshot read failure", async () => {
    const totals = emptyModelTotals();
    totals["bird-classic"]["near-miss"] = 10_000;
    const progress: ProgressState = {
      ...INITIAL_PROGRESS,
      unlocked: ["first-simulation"],
    };
    const history = new MemoryHistory();
    history.snapshot = { totals, progress };
    let saveSnapshotCalled = false;
    history.loadSnapshot = async () => {
      throw new Error("Transient IndexedDB read failure");
    };
    history.saveSnapshot = async () => {
      saveSnapshotCalled = true;
    };

    const degraded = createController({ history }).controller;
    await degraded.initialize();

    expect(degraded.state.persistenceDegraded).toBe(true);
    expect(saveSnapshotCalled).toBe(false);
    expect(history.snapshot.totals["bird-classic"]["near-miss"]).toBe(10_000);
    expect(history.snapshot.progress.unlocked).toContain("first-simulation");
  });

  it("preserves a consent denial when another setting changes immediately afterwards", async () => {
    const values = new Map<string, string>();
    const storage: KeyValuePort = {
      async get(key) {
        return values.get(key) ?? null;
      },
      async set(key, value) {
        values.set(key, value);
      },
    };
    await saveSettings({ ...DEFAULT_SETTINGS, analyticsConsent: "granted" }, storage);
    const controller = new AppController({
      history: new MemoryHistory(),
      loadSettings: () => loadSettings(storage),
      saveSettings: (settings) => saveSettings(settings, storage),
    });
    await controller.initialize();

    const denial = controller.updateSettings({ analyticsConsent: "denied" });
    const themeChange = controller.updateSettings({ theme: "dark" });
    await Promise.all([denial, themeChange]);

    await expect(loadSettings(storage)).resolves.toMatchObject({
      analyticsConsent: "denied",
      theme: "dark",
    });
    expect(controller.state.settings).toMatchObject({ analyticsConsent: "denied", theme: "dark" });
  });

  it("resets statistics and history but preserves settings and achievements", async () => {
    const progress: ProgressState = {
      ...INITIAL_PROGRESS,
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
