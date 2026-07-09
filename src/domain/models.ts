export type ModelId = "bird-classic" | "didactic-extended";

export type OutcomeId =
  "near-miss" | "property-damage" | "minor-injury" | "serious-injury" | "fatality";

export interface OutcomeDefinition {
  readonly id: OutcomeId;
  readonly weight: number;
  readonly label: string;
  readonly colorToken: string;
  readonly icon: "warning" | "damage" | "bandage" | "medical" | "fatality";
}

export interface SimulationModel {
  readonly id: ModelId;
  readonly label: string;
  readonly educationalDisclaimer?: string;
  readonly outcomes: readonly OutcomeDefinition[];
}

export const MODELS: Readonly<Record<ModelId, SimulationModel>> = {
  "bird-classic": {
    id: "bird-classic",
    label: "Bird clásico",
    outcomes: [
      {
        id: "near-miss",
        weight: 600,
        label: "Cuasi-accidente",
        colorToken: "near-miss",
        icon: "warning",
      },
      {
        id: "property-damage",
        weight: 30,
        label: "Daño material",
        colorToken: "property-damage",
        icon: "damage",
      },
      {
        id: "minor-injury",
        weight: 10,
        label: "Lesión menor",
        colorToken: "minor-injury",
        icon: "bandage",
      },
      {
        id: "serious-injury",
        weight: 1,
        label: "Lesión grave",
        colorToken: "serious-injury",
        icon: "medical",
      },
    ],
  },
  "didactic-extended": {
    id: "didactic-extended",
    label: "Modelo extendido",
    educationalDisclaimer:
      "Adaptación didáctica inspirada en la pirámide de Bird; no es el modelo histórico original.",
    outcomes: [
      {
        id: "near-miss",
        weight: 600,
        label: "Cuasi-accidente",
        colorToken: "near-miss",
        icon: "warning",
      },
      {
        id: "minor-injury",
        weight: 30,
        label: "Lesión menor",
        colorToken: "minor-injury",
        icon: "bandage",
      },
      {
        id: "serious-injury",
        weight: 10,
        label: "Lesión grave",
        colorToken: "serious-injury",
        icon: "medical",
      },
      {
        id: "fatality",
        weight: 1,
        label: "Fatalidad",
        colorToken: "fatality",
        icon: "fatality",
      },
    ],
  },
};

export function getModel(modelId: ModelId): SimulationModel {
  return MODELS[modelId];
}
