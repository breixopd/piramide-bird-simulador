import { LitElement, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import type { AppState } from "../app-controller";
import "../components/bird-pyramid";
import "../components/count-up";
import "../components/event-rain";
import { icon, type AppIconName } from "../components/app-icon";
import { selectScenarioQuestion, type Scenario, type ScenarioQuestion } from "../data/scenarios";
import { classifyHorizontalSwipe, type GesturePoint } from "../domain/gestures";
import { MODELS, type ModelId, type OutcomeId } from "../domain/models";
import type { SimulationBatchSize, SimulationRunSummary } from "../platform/history";

const sectorNames = {
  construction: "Construcción",
  production: "Producción",
  logistics: "Logística",
  maintenance: "Mantenimiento",
  cleaning: "Limpieza",
  hospitality: "Hostelería",
  office: "Oficina",
  agriculture: "Sector agrario",
} as const;

const outcomeCycle: ReadonlyArray<{ id: OutcomeId; icon: AppIconName }> = [
  { id: "near-miss", icon: "alert" },
  { id: "property-damage", icon: "damage" },
  { id: "minor-injury", icon: "bandage" },
  { id: "serious-injury", icon: "medical" },
  { id: "fatality", icon: "fatality" },
];
const defaultOutcomeEntry = outcomeCycle[0]!;

@customElement("home-view")
export class HomeView extends LitElement {
  @property({ attribute: false }) state?: AppState;

  /** True while the launch/rain animation should play. Held independently of the
   * near-instant controller `running` flag so motion actually has time to run. */
  @state() private isAnimating = false;
  @state() private cycleIndex = 0;
  @state() private learningAnswer?: { runId: string; optionId: string };
  @state() private expandedBatchRunId?: string;

  private readonly animationDurations: Record<SimulationBatchSize, number> = {
    1: 1400,
    100: 1200,
    1000: 1500,
  };
  private animationTimer?: ReturnType<typeof setTimeout>;
  private cycleTimer?: ReturnType<typeof setInterval>;
  private lastRunId?: string;

  private swipeStart?: GesturePoint;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  disconnectedCallback(): void {
    clearTimeout(this.animationTimer);
    clearInterval(this.cycleTimer);
    super.disconnectedCallback();
  }

  protected updated(changed: PropertyValues): void {
    // Flash the result summary when a new run lands (not on every render).
    const runId = this.state?.latestRun?.id;
    if (changed.has("state") && runId && runId !== this.lastRunId) {
      this.lastRunId = runId;
      const summary = this.querySelector<HTMLElement>(".result-card__summary");
      if (summary) {
        summary.classList.remove("is-updated");
        // Force reflow so the animation can replay.
        void summary.offsetWidth;
        summary.classList.add("is-updated");
      }
    }
  }

  protected render() {
    if (!this.state) return nothing;
    const model = MODELS[this.state.activeModelId];
    const latestOutcome = this.state.selectedScenario?.outcome ?? "near-miss";
    const launchOutcome = this.isAnimating
      ? (outcomeCycle[this.cycleIndex] ?? defaultOutcomeEntry)
      : (outcomeCycle.find((entry) => entry.id === latestOutcome) ?? defaultOutcomeEntry);
    return html`<section class="view home-view" aria-labelledby="home-title">
      <header class="page-header page-header--home">
        <div class="brand-row">
          <span class="brand-mark" aria-hidden="true">${icon("target")}</span>
          <div class="brand-text">
            <span>Simulador educativo</span>
          </div>
          <div class="home-ratio" aria-label="Proporción clásica de Bird">
            <span>RATIO BIRD</span>
            <strong>600:30:10:1</strong>
          </div>
        </div>
        <h1 id="home-title" tabindex="-1">Pirámide de Bird</h1>
        <p class="home-tagline">Prevención en <em>proporción</em>.</p>
        <p class="home-lede">
          Los incidentes pequeños también cuentan. Lanza eventos y descubre cuántos cuasi-accidentes
          hay detrás de cada suceso grave.
        </p>
      </header>

      <div class="model-switch" role="group" aria-label="Modelo de simulación">
        ${Object.values(MODELS).map(
          (option) =>
            html`<button
              type="button"
              class=${this.state?.activeModelId === option.id ? "is-active" : ""}
              aria-pressed=${this.state?.activeModelId === option.id ? "true" : "false"}
              @click=${() => this.selectModel(option.id)}
            >
              ${this.state?.activeModelId === option.id ? icon("check") : icon("target")}
              <span>${option.label}</span>
            </button>`,
        )}
      </div>

      ${
        model.educationalDisclaimer
          ? html`<aside class="educational-note">
              <strong>Adaptación didáctica</strong>
              <span>${model.educationalDisclaimer}</span>
            </aside>`
          : nothing
      }

      <div class="home-workspace">
        <div class="home-workspace__simulation">
          <div class="simulation-area">
            <div class="simulation-stage">
              <div class="stage-meta" aria-hidden="true">
                <span class="stage-meta__model"><i></i> ${model.label}</span>
                <span class="stage-meta__hint">Toca un nivel para explorar</span>
              </div>
              <div
                class="pyramid-viewport"
                data-gesture-surface="pyramid"
                @touchstart=${this.onTouchStart}
                @touchend=${this.onTouchEnd}
                @touchcancel=${this.resetTouchGesture}
              >
                <bird-pyramid .model=${model} .highlighted=${latestOutcome}></bird-pyramid>
              </div>
              <event-rain
                .run=${this.state.latestRun}
                .reducedMotion=${this.state.settings.reducedMotion}
                .active=${this.isAnimating}
              ></event-rain>
            </div>
          </div>

          <div class="simulation-controls" aria-label="Controles de simulación">
            <button
              type="button"
              class="primary-action outcome-${launchOutcome.id} ${
                this.isAnimating ? "is-cycling" : ""
              }"
              data-outcome=${launchOutcome.id}
              aria-label="Simular 1 evento"
              ?disabled=${this.state.running || this.isAnimating}
              @click=${() => this.simulate(1)}
            >
              <span class="launch-symbol" aria-hidden="true">${icon(launchOutcome.icon)}</span>
              <span>${this.isAnimating ? "Lanzando…" : "Lanzar"}</span>
            </button>
            <button
              type="button"
              class="batch-action"
              aria-label="Simular 100 eventos"
              ?disabled=${this.state.running || this.isAnimating}
              @click=${() => this.simulate(100)}
            >
              <strong>×100</strong><small>eventos</small>
            </button>
            <button
              type="button"
              class="batch-action"
              aria-label="Simular 1000 eventos"
              ?disabled=${this.state.running || this.isAnimating}
              @click=${() => this.simulate(1000)}
            >
              <strong>×1000</strong><small>eventos</small>
            </button>
          </div>
        </div>
        <div class="home-workspace__result">${this.renderResult()}</div>
      </div>
    </section>`;
  }

  private renderResult() {
    if (!this.state?.latestRun) {
      return html`<aside class="empty-prompt">
        ${icon("target")}
        <p>Lanza un evento para descubrir un caso y sus medidas preventivas.</p>
      </aside>`;
    }
    const run = this.state.latestRun;
    if (run.iterations > 1) return this.renderBatchResult(run, this.state.selectedScenario);

    return html`<section class="result-card" aria-labelledby="case-title">
      <div class="result-card__summary">
        <span class="result-card__count">${run.iterations}</span>
        <p>
          <strong>Evento simulado</strong><br />Convergencia
          <count-up
            .value=${Math.round(run.convergenceScore * 1000) / 10}
            .decimals=${1}
            .suffix=${" %"}
            duration=${900}
          ></count-up>
        </p>
        <button
          type="button"
          class="share-action"
          aria-label="Compartir tarjeta de resultado"
          @click=${this.shareResult}
        >
          ${icon("share")}
        </button>
      </div>
      ${
        this.state.selectedScenario
          ? this.renderScenarioCase(this.state.selectedScenario, run, "Caso preventivo")
          : nothing
      }
    </section>`;
  }

  private renderBatchResult(run: SimulationRunSummary, scenario: Scenario | null) {
    const model = MODELS[run.modelId];
    const weightTotal = model.outcomes.reduce((total, outcome) => total + outcome.weight, 0);
    const rows = model.outcomes.map((outcome) => {
      const observed = run.counts[outcome.id] ?? 0;
      const expected = (outcome.weight / weightTotal) * run.iterations;
      const observedPercent = (observed / run.iterations) * 100;
      const expectedPercent = (outcome.weight / weightTotal) * 100;
      return { outcome, observed, expected, delta: observedPercent - expectedPercent };
    });
    const notable = rows.reduce((current, candidate) =>
      Math.abs(candidate.delta) > Math.abs(current.delta) ? candidate : current,
    );
    const batchScore = run.batchConvergenceScore ?? run.convergenceScore;
    const isReport = run.iterations === 1000;
    const caseExpanded = this.expandedBatchRunId === run.id;
    const decimal = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

    const learningInvite = scenario
      ? html`<section class="batch-learning-invite">
          <span class="batch-learning-invite__icon" aria-hidden="true">${icon("target")}</span>
          <div>
            <p class="eyebrow">Pregunta opcional · 1 minuto</p>
            <h3>Pon a prueba tu mirada preventiva</h3>
            <p>Analiza un caso breve de esta tanda y elige una sola respuesta.</p>
          </div>
          <button
            type="button"
            class="secondary-action batch-case-toggle"
            aria-expanded=${caseExpanded ? "true" : "false"}
            @click=${() => this.toggleBatchCase(run.id)}
          >
            ${icon(caseExpanded ? "close" : "play")}
            ${caseExpanded ? "Ocultar pregunta" : "Responder pregunta"}
          </button>
        </section>`
      : nothing;

    return html`<section
      class="result-card batch-result ${isReport ? "batch-result--report" : "batch-result--shift"}"
      aria-label="${run.iterations} eventos"
    >
      <header class="batch-result__header">
        <div>
          <p class="eyebrow">${isReport ? "Informe de convergencia" : "Turno de 100 eventos"}</p>
          <h2 id="batch-result-title">
            ${isReport ? "1.000 eventos analizados" : "Así se repartió el turno"}
          </h2>
          <p>
            ${
              isReport
                ? "Compara una muestra amplia con la proporción teórica del modelo."
                : "Una lectura práctica de lo ocurrido en esta tanda, sin predecir el siguiente evento."
            }
          </p>
        </div>
        <button
          type="button"
          class="share-action"
          aria-label="Compartir tarjeta de resultado"
          @click=${this.shareResult}
        >
          ${icon("share")}
        </button>
      </header>

      ${
        isReport
          ? html`<section class="batch-report-score" aria-label="Convergencia de la simulación">
              <span class="batch-report-score__number">${(batchScore * 100).toFixed(1)} %</span>
              <div>
                <strong>Ajuste de esta muestra</strong>
                <p>100 % sería una coincidencia exacta con la proporción teórica.</p>
              </div>
              <dl>
                <div>
                  <dt>Muestra</dt>
                  <dd>1.000</dd>
                </div>
                <div>
                  <dt>Histórico</dt>
                  <dd>${(run.convergenceScore * 100).toFixed(1)} %</dd>
                </div>
              </dl>
            </section>`
          : html`<section class="batch-shift-reading" aria-label="Lectura práctica del turno">
              <span class="batch-shift-reading__number"
                >${(run.counts["near-miss"] ?? 0).toLocaleString("es-ES")}</span
              >
              <div>
                <strong>cuasi accidentes en este turno</strong>
                <p>
                  Son avisos sin lesión que permiten revisar barreras antes de que el daño ocurra.
                </p>
              </div>
            </section>`
      }

      <div class="batch-distribution">
        <div class="batch-distribution__heading">
          <h3>Distribución observada</h3>
          <span>Real · esperado</span>
        </div>
        <ul>
          ${rows.map(
            ({ outcome, observed, expected, delta }) =>
              html`<li>
                <i class="batch-distribution__dot outcome-${outcome.id}" aria-hidden="true"></i>
                <span>
                  <strong>${outcome.label}</strong>
                  <small
                    >${observed.toLocaleString("es-ES")} · ${decimal.format(expected)}
                    esperados</small
                  >
                </span>
                <em class=${Math.abs(delta) < 0.05 ? "is-neutral" : ""}
                  >${delta > 0 ? "+" : ""}${delta.toFixed(1)} pp</em
                >
              </li>`,
          )}
        </ul>
      </div>

      ${!isReport ? learningInvite : nothing}

      <p class="batch-insight">
        ${icon("info")}
        <span>
          ${
            isReport
              ? html`La mayor diferencia aparece en <strong>${notable.outcome.label}</strong>:
                  ${Math.abs(notable.delta).toFixed(1)} puntos porcentuales
                  ${notable.delta >= 0 ? "por encima" : "por debajo"} de la proporción teórica.`
              : html`En tandas de 100 es normal ver variación. Aquí
                  <strong>${notable.outcome.label}</strong> se separó
                  ${Math.abs(notable.delta).toFixed(1)} puntos de lo esperado.`
          }
        </span>
      </p>

      ${isReport ? learningInvite : nothing}
      ${
        caseExpanded && scenario
          ? this.renderScenarioCase(scenario, run, "Caso para reflexionar")
          : nothing
      }
    </section>`;
  }

  private renderScenarioCase(scenario: Scenario, run: SimulationRunSummary, title: string) {
    const question = selectScenarioQuestion(scenario, run.id);
    const answer =
      this.learningAnswer?.runId === run.id
        ? question.options.find(({ id }) => id === this.learningAnswer?.optionId)
        : undefined;
    return html`<div class="result-card__body">
      <p class="sector-label">${sectorNames[scenario.sector]}</p>
      <h2 id="case-title">${title}</h2>
      <p>${scenario.narrative}</p>
      <fieldset class="learning-check">
        <legend>${question.prompt}</legend>
        <p>${question.instruction}</p>
        <div class="learning-check__options">
          ${question.options.map(
            (option) =>
              html`<button
                type="button"
                class=${answer?.id === option.id ? "is-selected" : ""}
                data-correct=${option.correct ? "true" : "false"}
                ?disabled=${Boolean(answer)}
                @click=${() => this.answerLearningCheck(question, option.id)}
              >
                ${answer && option.correct ? icon("check") : nothing}
                <span>${option.label}</span>
              </button>`,
          )}
        </div>
      </fieldset>
      ${
        answer
          ? html`<p
                class="learning-feedback ${answer.correct ? "is-correct" : "is-learning"}"
                role="status"
                aria-live="polite"
              >
                ${icon(answer.correct ? "check" : "info")}
                <span
                  >${
                    answer.correct
                      ? question.correctFeedback
                      : `Sigue aprendiendo: ${question.incorrectFeedback}`
                  }</span
                >
              </p>
              <div class="learning-reveal">
                <dl class="scenario-details">
                  <div>
                    <dt>Peligro</dt>
                    <dd>${scenario.hazard}</dd>
                  </div>
                  <div>
                    <dt>Causa inmediata</dt>
                    <dd>${scenario.immediateCause}</dd>
                  </div>
                </dl>
                <h3>Qué habría que hacer</h3>
                <ul>
                  ${scenario.preventiveActions.map(
                    (action) => html`<li>${icon("check")}<span>${action}</span></li>`,
                  )}
                </ul>
              </div>`
          : nothing
      }
    </div>`;
  }

  private selectModel(modelId: ModelId): void {
    this.dispatchEvent(new CustomEvent("model-select", { detail: modelId, bubbles: true }));
  }

  private answerLearningCheck(question: ScenarioQuestion, optionId: string): void {
    const runId = this.state?.latestRun?.id;
    const scenarioId = this.state?.selectedScenario?.id;
    if (!runId || !scenarioId || this.learningAnswer?.runId === runId) return;
    const option = question.options.find(({ id }) => id === optionId);
    if (!option) return;
    this.learningAnswer = { runId, optionId };
    this.dispatchEvent(
      new CustomEvent("learning-answer", {
        detail: { runId, scenarioId, correct: option.correct },
        bubbles: true,
      }),
    );
  }

  private toggleBatchCase(runId: string): void {
    this.expandedBatchRunId = this.expandedBatchRunId === runId ? undefined : runId;
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.swipeStart = this.touchPoint(event.touches[0]);
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    if (this.swipeStart && event.changedTouches.length > 0) {
      const direction = classifyHorizontalSwipe(
        this.swipeStart,
        this.touchPoint(event.changedTouches[0]),
      );
      if (direction) {
        if (event.cancelable) event.preventDefault();
        this.selectModel(direction === "left" ? "didactic-extended" : "bird-classic");
      }
    }
    this.resetTouchGesture();
  }

  private resetTouchGesture(): void {
    this.swipeStart = undefined;
  }

  private touchPoint(touch: Touch | undefined): GesturePoint {
    return { x: touch?.clientX ?? 0, y: touch?.clientY ?? 0 };
  }

  private simulate(iterations: SimulationBatchSize): void {
    // Hold the animation window open long enough for the launch reel and rain to
    // play, regardless of how fast the controller resolves the run.
    this.startAnimationWindow(iterations);
    this.dispatchEvent(new CustomEvent("simulate", { detail: iterations, bubbles: true }));
  }

  private startAnimationWindow(iterations: SimulationBatchSize): void {
    clearTimeout(this.animationTimer);
    clearInterval(this.cycleTimer);
    this.cycleIndex = 0;
    this.isAnimating = true;
    const duration = this.state?.settings.reducedMotion ? 0 : this.animationDurations[iterations];
    if (duration <= 0) {
      this.isAnimating = false;
      return;
    }
    this.cycleTimer = setInterval(() => {
      this.cycleIndex = (this.cycleIndex + 1) % outcomeCycle.length;
    }, 120);
    this.animationTimer = setTimeout(() => {
      clearInterval(this.cycleTimer);
      this.isAnimating = false;
    }, duration);
  }

  private shareResult(): void {
    this.dispatchEvent(new CustomEvent("share-request", { bubbles: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "home-view": HomeView;
  }
}
