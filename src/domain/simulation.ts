import type { ModelId, OutcomeId, SimulationModel } from "./models";

export type RandomSource = () => number;

export interface SimulationResult {
  readonly modelId: ModelId;
  readonly sequence: readonly OutcomeId[];
  readonly counts: Readonly<Partial<Record<OutcomeId, number>>>;
}

export function pickOutcome(model: SimulationModel, random: RandomSource): OutcomeId {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("Random values must be in the interval [0, 1). ");
  }

  const totalWeight = model.outcomes.reduce((total, outcome) => total + outcome.weight, 0);
  const target = value * totalWeight;
  let cumulative = 0;

  for (const outcome of model.outcomes) {
    cumulative += outcome.weight;
    if (target < cumulative) return outcome.id;
  }

  throw new Error("The model contains no selectable outcome.");
}

export function simulate(
  model: SimulationModel,
  iterations: number,
  random: RandomSource = Math.random,
): SimulationResult {
  if (!Number.isSafeInteger(iterations) || iterations <= 0) {
    throw new RangeError("Iterations must be a positive integer.");
  }

  const sequence: OutcomeId[] = [];
  const counts: Partial<Record<OutcomeId, number>> = {};
  for (let index = 0; index < iterations; index += 1) {
    const outcome = pickOutcome(model, random);
    sequence.push(outcome);
    counts[outcome] = (counts[outcome] ?? 0) + 1;
  }

  return { modelId: model.id, sequence, counts };
}

export function calculateConvergence(
  model: SimulationModel,
  counts: Readonly<Partial<Record<OutcomeId, number>>>,
): number {
  const observedTotal = model.outcomes.reduce(
    (total, outcome) => total + (counts[outcome.id] ?? 0),
    0,
  );
  if (observedTotal === 0) return 0;

  const theoreticalTotal = model.outcomes.reduce((total, outcome) => total + outcome.weight, 0);
  const totalVariation = model.outcomes.reduce((distance, outcome) => {
    const observed = (counts[outcome.id] ?? 0) / observedTotal;
    const theoretical = outcome.weight / theoreticalTotal;
    return distance + Math.abs(observed - theoretical);
  }, 0);

  return Math.max(0, Math.min(1, 1 - totalVariation / 2));
}

export function calculateThreshold(eventProbability: number, targetProbability: number): number {
  if (eventProbability <= 0 || eventProbability >= 1) {
    throw new RangeError("Event probability must be between 0 and 1.");
  }
  if (targetProbability <= 0 || targetProbability >= 1) {
    throw new RangeError("Target probability must be between 0 and 1.");
  }
  return Math.ceil(Math.log(1 - targetProbability) / Math.log(1 - eventProbability));
}
