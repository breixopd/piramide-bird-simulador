import { calculateThreshold } from "./simulation";

export type ChallengeBand = "excellent" | "close" | "learning";

export interface ChallengeEvaluation {
  readonly guess: number;
  readonly expected: number;
  readonly mean: number;
  readonly relativeError: number;
  readonly band: ChallengeBand;
}

export const APEX_PROBABILITY = 1 / 641;
export const CHALLENGE_TARGET = calculateThreshold(APEX_PROBABILITY, 0.5);

export function evaluateChallenge(guess: number): ChallengeEvaluation {
  if (!Number.isSafeInteger(guess) || guess <= 0) {
    throw new RangeError("La estimación debe ser un entero positivo.");
  }
  const relativeError = Math.abs(guess - CHALLENGE_TARGET) / CHALLENGE_TARGET;
  const band: ChallengeBand =
    relativeError <= 0.1 ? "excellent" : relativeError <= 0.25 ? "close" : "learning";
  return {
    guess,
    expected: CHALLENGE_TARGET,
    mean: 641,
    relativeError,
    band,
  };
}
