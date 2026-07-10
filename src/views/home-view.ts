import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import type { AppState } from "../app-controller";
import "../components/bird-pyramid";
import "../components/event-rain";
import { icon } from "../components/app-icon";
import "../components/symbolic-die";
import {
  clampZoom,
  classifyHorizontalSwipe,
  distance,
  type GesturePoint,
} from "../domain/gestures";
import { MODELS, type ModelId } from "../domain/models";
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

@customElement("home-view")
export class HomeView extends LitElement {
  @property({ attribute: false }) state?: AppState;

  @state() private pyramidZoom = 1;

  private swipeStart?: GesturePoint;
  private pinchStartDistance = 0;
  private pinchStartZoom = 1;
  private gestureHadPinch = false;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected render() {
    if (!this.state) return nothing;
    const model = MODELS[this.state.activeModelId];
    const latestOutcome = this.state.selectedScenario?.outcome ?? "near-miss";
    return html`<section class="view home-view" aria-labelledby="home-title">
      <header class="page-header page-header--home">
        <div class="home-identity">
          <span class="home-identity__mark">${icon("target")}</span>
          <span>PRL / CONTROL ROOM</span>
          <span class="home-identity__status"><i></i> MODO LOCAL</span>
        </div>
        <div class="home-title-row">
          <div>
            <p class="eyebrow">Simulador educativo</p>
            <h1 id="home-title" tabindex="-1">Pirámide de Bird</h1>
            <p>
              Los incidentes pequeños también cuentan. Explora la proporción detrás de la
              prevención.
            </p>
          </div>
          <div class="home-ratio" aria-label="Proporción clásica de Bird">
            <span>RATIO BIRD</span>
            <strong>600<span>:</span>30<span>:</span>10<span>:</span>1</strong>
          </div>
        </div>
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

      <div class="simulation-stage">
        <div class="stage-meta" aria-hidden="true">
          <span><i></i> ${model.label}</span>
          <span>TOCA UN NIVEL PARA EXPLORAR</span>
        </div>
        <div
          class="pyramid-viewport"
          data-gesture-surface="pyramid"
          @touchstart=${this.onTouchStart}
          @touchmove=${this.onTouchMove}
          @touchend=${this.onTouchEnd}
          @touchcancel=${this.resetTouchGesture}
        >
          <div class="pyramid-zoom-canvas" style=${`--pyramid-zoom:${this.pyramidZoom}`}>
            <bird-pyramid
              style=${`--pyramid-zoom:${this.pyramidZoom}`}
              .model=${model}
              .highlighted=${latestOutcome}
            ></bird-pyramid>
          </div>
        </div>
        <symbolic-die .outcome=${latestOutcome} .rolling=${this.state.running}></symbolic-die>
        <event-rain
          .run=${this.state.latestRun}
          .reducedMotion=${this.state.settings.reducedMotion}
        ></event-rain>
      </div>

      <div class="zoom-controls" role="group" aria-label="Zoom de la pirámide">
        <button
          type="button"
          aria-label="Reducir pirámide"
          ?disabled=${this.pyramidZoom <= 1}
          @click=${() => this.changeZoom(-0.25)}
        >
          <span aria-hidden="true">−</span>
        </button>
        <button type="button" aria-label="Restablecer zoom de la pirámide" @click=${this.resetZoom}>
          ${Math.round(this.pyramidZoom * 100)} %
        </button>
        <button
          type="button"
          aria-label="Ampliar pirámide"
          ?disabled=${this.pyramidZoom >= 2.5}
          @click=${() => this.changeZoom(0.25)}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>

      <div class="simulation-controls" aria-label="Controles de simulación">
        <button
          type="button"
          class="primary-action"
          aria-label="Simular 1 evento"
          ?disabled=${this.state.running}
          @click=${() => this.simulate(1)}
        >
          ${icon("cube")}<span>Lanzar dado</span>
        </button>
        <button
          type="button"
          class="batch-action"
          aria-label="Simular 100 eventos"
          ?disabled=${this.state.running}
          @click=${() => this.simulate(100)}
        >
          <strong>×100</strong><small>eventos</small>
        </button>
        <button
          type="button"
          class="batch-action"
          aria-label="Simular 1000 eventos"
          ?disabled=${this.state.running}
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
        ${icon("cube")}
        <p>Lanza el dado para descubrir un caso y sus medidas preventivas.</p>
      </aside>`;
    }
    const scenario = this.state.selectedScenario;
    return html`<section class="result-card" aria-labelledby="case-title">
      <div class="result-card__summary">
        <span class="result-card__count">${this.state.latestRun.iterations}</span>
        <p>
          <strong
            >${this.state.latestRun.iterations === 1 ? "evento simulado" : "eventos simulados"}</strong
          ><br />Convergencia ${Math.round(this.state.latestRun.convergenceScore * 1000) / 10} %
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

  private changeZoom(delta: number): void {
    this.pyramidZoom = clampZoom(this.pyramidZoom + delta);
  }

  private resetZoom(): void {
    this.pyramidZoom = 1;
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.swipeStart = this.touchPoint(event.touches[0]);
      this.gestureHadPinch = false;
      return;
    }
    if (event.touches.length === 2) {
      this.beginPinch(event.touches);
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (event.touches.length !== 2) return;
    if (!this.gestureHadPinch) this.beginPinch(event.touches);
    const currentDistance = distance(
      this.touchPoint(event.touches[0]),
      this.touchPoint(event.touches[1]),
    );
    if (this.pinchStartDistance > 0) {
      this.pyramidZoom = clampZoom(
        this.pinchStartZoom * (currentDistance / this.pinchStartDistance),
      );
    }
    if (event.cancelable) event.preventDefault();
  }

  private onTouchEnd(event: TouchEvent): void {
    if (!this.gestureHadPinch && this.swipeStart && event.changedTouches.length > 0) {
      const direction = classifyHorizontalSwipe(
        this.swipeStart,
        this.touchPoint(event.changedTouches[0]),
      );
      if (direction) {
        if (event.cancelable) event.preventDefault();
        this.selectModel(direction === "left" ? "didactic-extended" : "bird-classic");
      }
    }
    if (event.touches.length === 0) this.resetTouchGesture();
  }

  private beginPinch(touches: TouchList): void {
    this.gestureHadPinch = true;
    this.swipeStart = undefined;
    this.pinchStartZoom = this.pyramidZoom;
    this.pinchStartDistance = distance(this.touchPoint(touches[0]), this.touchPoint(touches[1]));
  }

  private resetTouchGesture(): void {
    this.swipeStart = undefined;
    this.pinchStartDistance = 0;
    this.gestureHadPinch = false;
  }

  private touchPoint(touch: Touch | undefined): GesturePoint {
    return { x: touch?.clientX ?? 0, y: touch?.clientY ?? 0 };
  }

  private simulate(iterations: SimulationBatchSize): void {
    this.dispatchEvent(new CustomEvent("simulate", { detail: iterations, bubbles: true }));
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
