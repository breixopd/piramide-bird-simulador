import { scenarios, type Scenario } from "./data/scenarios";
import { MODELS, type ModelId, type OutcomeId } from "./domain/models";
import { INITIAL_PROGRESS, type ProgressState, updateProgress } from "./domain/progress";
import { calculateConvergence, simulate, type RandomSource } from "./domain/simulation";
import type {
  HistoryRepository,
  SimulationBatchSize,
  SimulationRunSummary,
} from "./platform/history";
import { DEFAULT_SETTINGS, type SettingsState } from "./platform/settings";

type OutcomeCounts = Partial<Record<OutcomeId, number>>;
type ModelTotals = Record<ModelId, OutcomeCounts>;

export interface AppState {
  readonly initialized: boolean;
  readonly activeModelId: ModelId;
  readonly settings: SettingsState;
  readonly progress: ProgressState;
  readonly history: readonly SimulationRunSummary[];
  readonly totals: ModelTotals;
  readonly selectedScenario: Scenario | null;
  readonly latestRun: SimulationRunSummary | null;
  readonly running: boolean;
}

export interface AppControllerDependencies {
  readonly history: HistoryRepository;
  readonly loadProgress: () => Promise<ProgressState>;
  readonly saveProgress: (progress: ProgressState) => Promise<void>;
  readonly loadSettings: () => Promise<SettingsState>;
  readonly saveSettings: (settings: SettingsState) => Promise<void>;
  readonly now?: () => Date;
  readonly createId?: () => string;
  readonly scenarioRandom?: RandomSource;
}

function emptyTotals(): ModelTotals {
  return { "bird-classic": {}, "didactic-extended": {} };
}

function addCounts(target: OutcomeCounts, source: Readonly<OutcomeCounts>): void {
  for (const [outcome, count] of Object.entries(source) as [OutcomeId, number][]) {
    target[outcome] = (target[outcome] ?? 0) + count;
  }
}

function countTotal(counts: OutcomeCounts): number {
  return Object.values(counts).reduce<number>((total, count) => total + (count ?? 0), 0);
}

export class AppController {
  private readonly listeners = new Set<() => void>();
  private readonly lastScenarioByOutcome = new Map<OutcomeId, string>();
  private readonly now: () => Date;
  private readonly createId: () => string;
  private readonly scenarioRandom: RandomSource;

  state: AppState = {
    initialized: false,
    activeModelId: "bird-classic",
    settings: DEFAULT_SETTINGS,
    progress: INITIAL_PROGRESS,
    history: [],
    totals: emptyTotals(),
    selectedScenario: null,
    latestRun: null,
    running: false,
  };

  constructor(private readonly dependencies: AppControllerDependencies) {
    this.now = dependencies.now ?? (() => new Date());
    this.createId = dependencies.createId ?? (() => crypto.randomUUID());
    this.scenarioRandom = dependencies.scenarioRandom ?? Math.random;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async initialize(): Promise<void> {
    const [history, progress, settings] = await Promise.all([
      this.dependencies.history.list(),
      this.dependencies.loadProgress(),
      this.dependencies.loadSettings(),
    ]);
    const totals = emptyTotals();
    for (const run of history) addCounts(totals[run.modelId], run.counts);
    this.updateState({ history, progress, settings, totals, initialized: true });
  }

  setModel(modelId: ModelId): void {
    this.updateState({ activeModelId: modelId, selectedScenario: null });
  }

  async run(
    iterations: SimulationBatchSize,
    random: RandomSource = Math.random,
  ): Promise<SimulationRunSummary> {
    this.updateState({ running: true });
    try {
      const model = MODELS[this.state.activeModelId];
      const result = simulate(model, iterations, random);
      const totals = {
        "bird-classic": { ...this.state.totals["bird-classic"] },
        "didactic-extended": { ...this.state.totals["didactic-extended"] },
      } satisfies ModelTotals;
      const totalBeforeRun = countTotal(totals[model.id]);
      addCounts(totals[model.id], result.counts);
      const convergenceScore = calculateConvergence(model, totals[model.id]);
      const run: SimulationRunSummary = {
        id: this.createId(),
        modelId: model.id,
        createdAt: this.now().toISOString(),
        iterations,
        counts: result.counts,
        convergenceScore,
      };
      const progress = updateProgress(this.state.progress, {
        modelId: model.id,
        sequence: result.sequence,
        convergenceScore,
        totalBeforeRun,
      });
      await Promise.all([
        this.dependencies.history.save(run),
        this.dependencies.saveProgress(progress),
      ]);
      const history = await this.dependencies.history.list();
      const selectedScenario = this.pickScenario(result.sequence.at(-1) ?? "near-miss");
      this.updateState({ totals, progress, history, latestRun: run, selectedScenario });
      return run;
    } finally {
      this.updateState({ running: false });
    }
  }

  async updateSettings(patch: Partial<Omit<SettingsState, "version">>): Promise<void> {
    const settings: SettingsState = { ...this.state.settings, ...patch, version: 1 };
    await this.dependencies.saveSettings(settings);
    this.updateState({ settings });
  }

  async resetStatistics(): Promise<void> {
    await this.dependencies.history.clear();
    this.updateState({
      history: [],
      totals: emptyTotals(),
      latestRun: null,
      selectedScenario: null,
    });
  }

  private pickScenario(outcome: OutcomeId): Scenario | null {
    const matches = scenarios.filter((scenario) => scenario.outcome === outcome);
    if (matches.length === 0) return null;
    let index = Math.floor(this.scenarioRandom() * matches.length);
    if (matches[index]?.id === this.lastScenarioByOutcome.get(outcome) && matches.length > 1) {
      index = (index + 1) % matches.length;
    }
    const selected = matches[index] ?? matches[0] ?? null;
    if (selected !== null) this.lastScenarioByOutcome.set(outcome, selected.id);
    return selected;
  }

  private updateState(patch: Partial<AppState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
}
