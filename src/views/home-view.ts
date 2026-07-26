import { LitElement, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import type { AppState } from "../app-controller";
import "../components/bird-pyramid";
import "../components/count-up";
import "../components/event-rain";
import { icon, type AppIconName } from "../components/app-icon";
import { classifyHorizontalSwipe, type GesturePoint } from "../domain/gestures";
import { MODELS, type ModelId, type OutcomeId } from "../domain/models";
import type { SimulationBatchSize } from "../platform/history";

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

  private readonly animationDurations: Record<SimulationBatchSize, number> = {
    1: 1400,
    100: 1800,
    1000: 2200,
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
          ></event-rain>
        </div>
      </div>

      <div class="simulation-controls" aria-label="Controles de simulación">
        <button
          type="button"
          class="primary-action outcome-${launchOutcome.id} ${this.isAnimating ? "is-cycling" : ""}"
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

      <button
        type="button"
        class="challenge-entry"
        aria-label="Abrir desafío estadístico"
        @click=${this.openChallenge}
      >
        ${icon("target")}
        <span
          ><strong>Desafío estadístico</strong
          ><small>¿Cuándo aparecerá el evento de la cúspide?</small></span
        >
        <span aria-hidden="true">→</span>
      </button>

      ${this.renderResult()}
    </section>`;
  }

  private renderResult() {
    if (!this.state?.latestRun) {
      return html`<aside class="empty-prompt">
        ${icon("target")}
        <p>Lanza un evento para descubrir un caso y sus medidas preventivas.</p>
      </aside>`;
    }
    const scenario = this.state.selectedScenario;
    return html`<section class="result-card" aria-labelledby="case-title">
      <div class="result-card__summary">
        <span class="result-card__count">${this.state.latestRun.iterations}</span>
        <p>
          <strong
            >${this.state.latestRun.iterations === 1 ? "Evento simulado" : "Eventos simulados"}</strong
          ><br />Convergencia
          <count-up
            .value=${Math.round(this.state.latestRun.convergenceScore * 1000) / 10}
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
        scenario
          ? html`<div class="result-card__body">
              <p class="sector-label">${sectorNames[scenario.sector]}</p>
              <h2 id="case-title">Caso preventivo</h2>
              <p>${scenario.narrative}</p>
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
                ${scenario.preventiveActions.map((action) => html`<li>${icon("check")}<span>${action}</span></li>`)}
              </ul>
            </div>`
          : nothing
      }
    </section>`;
  }

  private selectModel(modelId: ModelId): void {
    this.dispatchEvent(new CustomEvent("model-select", { detail: modelId, bubbles: true }));
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

  private openChallenge(): void {
    this.dispatchEvent(new CustomEvent("challenge-open", { bubbles: true }));
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
