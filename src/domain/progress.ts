import type { ModelId, OutcomeId } from "./models";

export type AchievementId =
  | "first-simulation"
  | "hard-lesson"
  | "convergence-master"
  | "near-miss-streak-50"
  | "bulk-runner"
  | "hazard-spotter"
  | "hazard-streak-5"
  | "scenario-explorer-10";

export type AchievementMetric = "correctAnswers" | "bestCorrectStreak" | "answeredScenarios";

export interface AchievementDefinition {
  readonly id: AchievementId;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly target?: number;
  readonly metric?: AchievementMetric;
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: "hazard-spotter",
    name: "Primer análisis",
    description: "Respondiste correctamente una pregunta preventiva.",
    icon: "target",
    target: 1,
    metric: "correctAnswers",
  },
  {
    id: "hazard-streak-5",
    name: "Racha preventiva",
    description: "Respondiste correctamente cinco preguntas consecutivas.",
    icon: "streak",
    target: 5,
    metric: "bestCorrectStreak",
  },
  {
    id: "scenario-explorer-10",
    name: "Explorador de casos",
    description: "Respondiste preguntas de diez casos preventivos diferentes.",
    icon: "bars",
    target: 10,
    metric: "answeredScenarios",
  },
  {
    id: "first-simulation",
    name: "Primer paso",
    description: "Ejecutaste tu primera simulación.",
    icon: "play",
  },
  {
    id: "hard-lesson",
    name: "Lección dura",
    description: "Observaste la consecuencia más grave del modelo extendido.",
    icon: "alert",
  },
  {
    id: "convergence-master",
    name: "Estadístico de seguridad",
    description: "Alcanzaste un 98 % de similitud tras al menos 1.000 eventos.",
    icon: "target",
  },
  {
    id: "near-miss-streak-50",
    name: "Racha de cuasi-accidentes",
    description: "Observaste 50 cuasi-accidentes consecutivos.",
    icon: "streak",
  },
  {
    id: "bulk-runner",
    name: "Simulador masivo",
    description: "Ejecutaste 1.000 simulaciones de una vez.",
    icon: "bulk",
  },
];

export interface ProgressState {
  readonly unlocked: readonly AchievementId[];
  readonly currentNearMissStreak: number;
  readonly bestNearMissStreak: number;
  readonly questionsAnswered: number;
  readonly correctAnswers: number;
  readonly currentCorrectStreak: number;
  readonly bestCorrectStreak: number;
  readonly answeredScenarioIds: readonly string[];
}

export const INITIAL_PROGRESS: ProgressState = {
  unlocked: [],
  currentNearMissStreak: 0,
  bestNearMissStreak: 0,
  questionsAnswered: 0,
  correctAnswers: 0,
  currentCorrectStreak: 0,
  bestCorrectStreak: 0,
  answeredScenarioIds: [],
};

export interface ProgressUpdate {
  readonly modelId: ModelId;
  readonly sequence: readonly OutcomeId[];
  readonly convergenceScore: number;
  readonly totalBeforeRun: number;
}

export function updateProgress(state: ProgressState, update: ProgressUpdate): ProgressState {
  const unlocked = new Set(state.unlocked);
  let currentNearMissStreak = state.currentNearMissStreak;
  let bestNearMissStreak = state.bestNearMissStreak;

  if (update.sequence.length > 0) unlocked.add("first-simulation");
  if (update.sequence.length >= 1000) unlocked.add("bulk-runner");
  if (update.modelId === "didactic-extended" && update.sequence.includes("fatality")) {
    unlocked.add("hard-lesson");
  }

  for (const outcome of update.sequence) {
    currentNearMissStreak = outcome === "near-miss" ? currentNearMissStreak + 1 : 0;
    bestNearMissStreak = Math.max(bestNearMissStreak, currentNearMissStreak);
  }
  if (bestNearMissStreak >= 50) unlocked.add("near-miss-streak-50");

  if (update.totalBeforeRun + update.sequence.length >= 1000 && update.convergenceScore >= 0.98) {
    unlocked.add("convergence-master");
  }

  return {
    ...state,
    unlocked: [...unlocked],
    currentNearMissStreak,
    bestNearMissStreak,
  };
}

export interface LearningProgressUpdate {
  readonly scenarioId: string;
  readonly correct: boolean;
}

export function updateLearningProgress(
  state: ProgressState,
  update: LearningProgressUpdate,
): ProgressState {
  const unlocked = new Set(state.unlocked);
  const currentCorrectStreak = update.correct ? state.currentCorrectStreak + 1 : 0;
  const bestCorrectStreak = Math.max(state.bestCorrectStreak, currentCorrectStreak);
  const answeredScenarioIds = new Set(state.answeredScenarioIds);
  answeredScenarioIds.add(update.scenarioId);
  const correctAnswers = state.correctAnswers + (update.correct ? 1 : 0);

  if (correctAnswers >= 1) unlocked.add("hazard-spotter");
  if (bestCorrectStreak >= 5) unlocked.add("hazard-streak-5");
  if (answeredScenarioIds.size >= 10) unlocked.add("scenario-explorer-10");

  return {
    ...state,
    unlocked: [...unlocked],
    questionsAnswered: state.questionsAnswered + 1,
    correctAnswers,
    currentCorrectStreak,
    bestCorrectStreak,
    answeredScenarioIds: [...answeredScenarioIds],
  };
}

export function achievementMetricValue(progress: ProgressState, metric: AchievementMetric): number {
  switch (metric) {
    case "correctAnswers":
      return progress.correctAnswers;
    case "bestCorrectStreak":
      return progress.bestCorrectStreak;
    case "answeredScenarios":
      return progress.answeredScenarioIds.length;
  }
}

const achievementIds = new Set(ACHIEVEMENTS.map(({ id }) => id));

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

/**
 * Accepts both current progress and the pre-question schema, filling new
 * learning metrics with safe defaults so existing users keep their progress.
 */
export function normalizeProgress(value: unknown): ProgressState | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const progress = value as Record<string, unknown>;
  if (
    !Array.isArray(progress.unlocked) ||
    !progress.unlocked.every((id) => achievementIds.has(id as AchievementId)) ||
    !isNonNegativeInteger(progress.currentNearMissStreak) ||
    !isNonNegativeInteger(progress.bestNearMissStreak) ||
    Number(progress.bestNearMissStreak) < Number(progress.currentNearMissStreak)
  ) {
    return null;
  }

  const questionsAnswered = progress.questionsAnswered ?? 0;
  const correctAnswers = progress.correctAnswers ?? 0;
  const currentCorrectStreak = progress.currentCorrectStreak ?? 0;
  const bestCorrectStreak = progress.bestCorrectStreak ?? 0;
  const answeredScenarioIds = progress.answeredScenarioIds ?? [];
  if (
    !isNonNegativeInteger(questionsAnswered) ||
    !isNonNegativeInteger(correctAnswers) ||
    correctAnswers > questionsAnswered ||
    !isNonNegativeInteger(currentCorrectStreak) ||
    !isNonNegativeInteger(bestCorrectStreak) ||
    currentCorrectStreak > bestCorrectStreak ||
    !Array.isArray(answeredScenarioIds) ||
    !answeredScenarioIds.every((id) => typeof id === "string" && id.length > 0)
  ) {
    return null;
  }

  return {
    unlocked: [...(progress.unlocked as AchievementId[])],
    currentNearMissStreak: Number(progress.currentNearMissStreak),
    bestNearMissStreak: Number(progress.bestNearMissStreak),
    questionsAnswered,
    correctAnswers,
    currentCorrectStreak,
    bestCorrectStreak,
    answeredScenarioIds: [...new Set(answeredScenarioIds)],
  };
}
