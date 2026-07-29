import scenarioBankData from "./scenario-bank.json";

export const OUTCOMES = [
  "near-miss",
  "property-damage",
  "minor-injury",
  "serious-injury",
  "fatality",
] as const;

export type OutcomeId = (typeof OUTCOMES)[number];

export const SCENARIO_SECTORS = [
  "construction",
  "production",
  "logistics",
  "maintenance",
  "cleaning",
  "hospitality",
  "office",
  "agriculture",
] as const;

export type ScenarioSector = (typeof SCENARIO_SECTORS)[number];

export const QUESTION_TEMPLATE_IDS = [
  "identify-hazard",
  "identify-cause",
  "identify-consequence",
  "identify-prevention",
  "choose-first-control",
  "reinforce-control",
  "separate-cause-from-hazard",
  "prevent-recurrence",
] as const;

export type QuestionTemplateId = (typeof QUESTION_TEMPLATE_IDS)[number];

type ScenarioField =
  "hazard" | "immediateCause" | "consequence" | "preventiveActions.0" | "preventiveActions.1";

const SCENARIO_FIELDS: readonly ScenarioField[] = [
  "hazard",
  "immediateCause",
  "consequence",
  "preventiveActions.0",
  "preventiveActions.1",
];

interface QuestionTemplate {
  readonly id: QuestionTemplateId;
  readonly prompt: string;
  readonly instruction: string;
  readonly correctField: ScenarioField;
  readonly distractorFields: readonly [ScenarioField, ScenarioField];
  readonly correctFeedback: string;
  readonly incorrectFeedback: string;
}

export interface Scenario {
  readonly id: string;
  readonly outcome: OutcomeId;
  readonly sector: ScenarioSector;
  readonly narrative: string;
  readonly hazard: string;
  readonly immediateCause: string;
  readonly consequence: string;
  readonly preventiveActions: readonly [string, string];
  readonly sourceTags: readonly string[];
  readonly questionBank: readonly QuestionTemplateId[];
}

export interface ScenarioQuestionOption {
  readonly id: string;
  readonly label: string;
  readonly correct: boolean;
}

export interface ScenarioQuestion {
  readonly id: QuestionTemplateId;
  readonly prompt: string;
  readonly instruction: string;
  readonly options: readonly ScenarioQuestionOption[];
  readonly correctFeedback: string;
  readonly incorrectFeedback: string;
}

interface ScenarioBankDocument {
  readonly version: 1;
  readonly questionTemplates: readonly QuestionTemplate[];
  readonly scenarios: readonly Scenario[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function assertScenarioBank(value: unknown): asserts value is ScenarioBankDocument {
  if (!isRecord(value) || value.version !== 1) {
    throw new Error("El banco de escenarios debe declarar la versión 1.");
  }
  if (!Array.isArray(value.questionTemplates) || !Array.isArray(value.scenarios)) {
    throw new Error("El banco de escenarios no contiene las colecciones obligatorias.");
  }

  const templateIds = new Set<string>();
  for (const candidate of value.questionTemplates) {
    if (
      !isRecord(candidate) ||
      !isNonEmptyString(candidate.id) ||
      !QUESTION_TEMPLATE_IDS.includes(candidate.id as QuestionTemplateId)
    ) {
      throw new Error("El banco contiene un tipo de pregunta no compatible.");
    }
    if (
      !isNonEmptyString(candidate.prompt) ||
      !isNonEmptyString(candidate.instruction) ||
      !isNonEmptyString(candidate.correctFeedback) ||
      !isNonEmptyString(candidate.incorrectFeedback) ||
      !isNonEmptyString(candidate.correctField) ||
      !SCENARIO_FIELDS.includes(candidate.correctField as ScenarioField) ||
      !Array.isArray(candidate.distractorFields) ||
      candidate.distractorFields.length !== 2 ||
      !candidate.distractorFields.every(
        (field) => isNonEmptyString(field) && SCENARIO_FIELDS.includes(field as ScenarioField),
      )
    ) {
      throw new Error(`La plantilla ${String(candidate.id)} está incompleta.`);
    }
    if (templateIds.has(candidate.id)) {
      throw new Error(`La plantilla ${candidate.id} está duplicada.`);
    }
    templateIds.add(candidate.id);
  }

  for (const candidate of value.scenarios) {
    if (
      !isRecord(candidate) ||
      !isNonEmptyString(candidate.id) ||
      !OUTCOMES.includes(candidate.outcome as OutcomeId) ||
      !SCENARIO_SECTORS.includes(candidate.sector as ScenarioSector) ||
      !isNonEmptyString(candidate.narrative) ||
      !isNonEmptyString(candidate.hazard) ||
      !isNonEmptyString(candidate.immediateCause) ||
      !isNonEmptyString(candidate.consequence) ||
      !Array.isArray(candidate.preventiveActions) ||
      candidate.preventiveActions.length !== 2 ||
      !candidate.preventiveActions.every(isNonEmptyString) ||
      !Array.isArray(candidate.sourceTags) ||
      candidate.sourceTags.length === 0 ||
      !candidate.sourceTags.every(isNonEmptyString) ||
      !Array.isArray(candidate.questionBank) ||
      candidate.questionBank.length === 0 ||
      !candidate.questionBank.every((id) => isNonEmptyString(id) && templateIds.has(id))
    ) {
      throw new Error(`El escenario ${String(candidate.id ?? "desconocido")} está incompleto.`);
    }
  }
}

const rawScenarioBank: unknown = scenarioBankData;
assertScenarioBank(rawScenarioBank);

const templateById = new Map(
  rawScenarioBank.questionTemplates.map((template) => [template.id, template]),
);

export const scenarios: readonly Scenario[] = rawScenarioBank.scenarios;

function readScenarioField(scenario: Scenario, field: ScenarioField): string {
  if (field === "preventiveActions.0") return scenario.preventiveActions[0];
  if (field === "preventiveActions.1") return scenario.preventiveActions[1];
  return scenario[field];
}

function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function selectScenarioQuestion(scenario: Scenario, selectionKey: string): ScenarioQuestion {
  const questionIndex =
    stableHash(`${scenario.id}:${selectionKey}:question`) % scenario.questionBank.length;
  const templateId = scenario.questionBank[questionIndex];
  const template = templateId ? templateById.get(templateId) : undefined;
  if (!template) throw new Error(`No existe la plantilla de pregunta ${String(templateId)}.`);

  const fields = [template.correctField, ...template.distractorFields] as const;
  const offset = stableHash(`${scenario.id}:${selectionKey}:options`) % fields.length;
  const orderedFields = [...fields.slice(offset), ...fields.slice(0, offset)];
  const options = orderedFields.map((field) => ({
    id: `${template.id}:${field}`,
    label: readScenarioField(scenario, field),
    correct: field === template.correctField,
  }));

  return {
    id: template.id,
    prompt: template.prompt,
    instruction: template.instruction,
    options,
    correctFeedback: template.correctFeedback,
    incorrectFeedback: template.incorrectFeedback,
  };
}
