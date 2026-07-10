import { Preferences } from "@capacitor/preferences";

import type { ModelId, OutcomeId } from "../domain/models";
import type { KeyValuePort } from "./settings";

export type OutcomeCounts = Partial<Record<OutcomeId, number>>;
export type ModelTotals = Record<ModelId, OutcomeCounts>;

const TOTALS_STORAGE_KEY = "bird-pyramid.totals";
const modelIds = new Set<ModelId>(["bird-classic", "didactic-extended"]);
const outcomeIds = new Set<OutcomeId>([
  "near-miss",
  "property-damage",
  "minor-injury",
  "serious-injury",
  "fatality",
]);

export function emptyModelTotals(): ModelTotals {
  return { "bird-classic": {}, "didactic-extended": {} };
}

export function cloneModelTotals(totals: ModelTotals): ModelTotals {
  return {
    "bird-classic": { ...totals["bird-classic"] },
    "didactic-extended": { ...totals["didactic-extended"] },
  };
}

const preferencesAdapter: KeyValuePort = {
  async get(key) {
    return (await Preferences.get({ key })).value;
  },
  async set(key, value) {
    await Preferences.set({ key, value });
  },
};

function isOutcomeCounts(value: unknown): value is OutcomeCounts {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.entries(value).every(
    ([outcomeId, count]) =>
      outcomeIds.has(outcomeId as OutcomeId) && Number.isSafeInteger(count) && Number(count) >= 0,
  );
}

function isModelTotals(value: unknown): value is ModelTotals {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const totals = value as Record<string, unknown>;
  return (
    Object.keys(totals).length === modelIds.size &&
    Object.keys(totals).every((modelId) => modelIds.has(modelId as ModelId)) &&
    isOutcomeCounts(totals["bird-classic"]) &&
    isOutcomeCounts(totals["didactic-extended"])
  );
}

export async function loadModelTotals(
  storage: KeyValuePort = preferencesAdapter,
): Promise<ModelTotals | null> {
  const raw = await storage.get(TOTALS_STORAGE_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const envelope = parsed as Record<string, unknown>;
    return envelope.version === 1 && isModelTotals(envelope.totals)
      ? cloneModelTotals(envelope.totals)
      : null;
  } catch {
    return null;
  }
}

export async function saveModelTotals(
  totals: ModelTotals,
  storage: KeyValuePort = preferencesAdapter,
): Promise<void> {
  await storage.set(TOTALS_STORAGE_KEY, JSON.stringify({ version: 1, totals }));
}
