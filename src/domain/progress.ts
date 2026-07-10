import type { ModelId, OutcomeId } from "./models";

export type AchievementId =
  "first-simulation" | "hard-lesson" | "convergence-master" | "near-miss-streak-50" | "bulk-runner";

export interface AchievementDefinition {
  readonly id: AchievementId;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
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
}

export const INITIAL_PROGRESS: ProgressState = {
  unlocked: [],
  currentNearMissStreak: 0,
  bestNearMissStreak: 0,
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
    unlocked: [...unlocked],
    currentNearMissStreak,
    bestNearMissStreak,
  };
}
