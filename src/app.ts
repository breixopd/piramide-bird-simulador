import { LitElement, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import type { AppController } from "./app-controller";
import "./components/bottom-nav";
import type { AppTab } from "./components/bottom-nav";
import { icon } from "./components/app-icon";
import { evaluateChallenge, type ChallengeEvaluation } from "./domain/challenge";
import { MODELS, type ModelId, type OutcomeId } from "./domain/models";
import type { SimulationBatchSize, SimulationRunSummary } from "./platform/history";
import type { SettingsState } from "./platform/settings";
import type { TelemetryService } from "./platform/telemetry";
import "./views/achievements-view";
import "./views/home-view";
import "./views/info-view";
import "./views/stats-view";

const levelIconNames = {
  warning: "alert",
  damage: "damage",
  bandage: "bandage",
  medical: "medical",
  fatality: "fatality",
} as const;

@customElement("bird-app")
export class BirdApp extends LitElement {
  @property({ attribute: false }) controller?: AppController;
  @property({ attribute: false }) telemetry?: TelemetryService;
  @property({ attribute: false }) shareLatest?: (run: SimulationRunSummary) => Promise<void>;
  @property({ attribute: false }) hapticFeedback?: () => Promise<void>;

  @state() private activeTab: AppTab = "home";
  @state() private modal: "challenge" | "extended" | "level-detail" | "reset" | null = null;
  @state() private challengeGuess = "";
  @state() private challengeResult: ChallengeEvaluation | null = null;
  @state() private challengeError = "";
  @state() private resetError = "";
  @state() private announcement = "";

  private unsubscribe?: () => void;
  private pendingModel: ModelId | null = null;
  private selectedOutcomeId: OutcomeId | null = null;
  private modalReturnFocus?: HTMLElement;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
    super.disconnectedCallback();
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has("controller")) {
      this.unsubscribe?.();
      this.unsubscribe = this.controller?.subscribe(() => this.requestUpdate());
    }
    if (changed.has("modal") && this.modal) {
      requestAnimationFrame(() => this.querySelector<HTMLElement>(".modal")?.focus());
    }
  }

  protected render() {
    const state = this.controller?.state;
    if (!state) {
      return html`<main class="loading-screen" aria-busy="true">
        <span class="loading-mark">${icon("target")}</span>
        <p>Preparando el simulador…</p>
      </main>`;
    }
    this.dataset.theme = state.settings.theme;
    this.dataset.motion = state.settings.reducedMotion ? "reduced" : "full";

    if (!state.initialized) {
      return html`<main class="loading-screen" aria-busy="true">
        <span class="loading-mark">${icon("target")}</span>
        <p>Preparando el simulador…</p>
      </main>`;
    }

    return html`<div class="app-shell">
      ${
        state.persistenceDegraded
          ? html`<aside class="storage-warning" role="alert">
              ${icon("alert")}
              <span
                ><strong>Guardado local no disponible.</strong> Puedes seguir usando la app, pero
                los cambios de esta sesión no se guardarán al cerrarla.</span
              >
            </aside>`
          : nothing
      }
      <main
        class="app-main"
        @model-select=${this.onModelSelect}
        @level-detail=${this.openLevelDetail}
        @simulate=${this.onSimulate}
        @challenge-open=${this.openChallenge}
        @setting-change=${this.onSettingChange}
        @reset-request=${this.openReset}
        @share-request=${this.onShareRequest}
      >
        ${this.renderActiveView()}
      </main>
      <p class="sr-only" role="status" aria-live="polite">${this.announcement}</p>
      <bottom-nav
        .active=${this.activeTab}
        @tab-select=${this.onTabSelect}
        @simulate=${this.onSimulate}
      ></bottom-nav>
      ${this.renderModal()}
    </div>`;
  }

  private renderActiveView() {
    const appState = this.controller?.state;
    if (!appState) return nothing;
    switch (this.activeTab) {
      case "home":
        return html`<home-view .state=${appState}></home-view>`;
      case "stats":
        return html`<stats-view .state=${appState}></stats-view>`;
      case "achievements":
        return html`<achievements-view .state=${appState}></achievements-view>`;
      case "info":
        return html`<info-view .state=${appState}></info-view>`;
    }
  }

  private renderModal() {
    if (!this.modal) return nothing;
    const content = {
      challenge: this.renderChallengeModal(),
      extended: this.renderExtendedModal(),
      "level-detail": this.renderLevelDetailModal(),
      reset: this.renderResetModal(),
    }[this.modal];
    return html`<div
      class="modal-backdrop"
      @click=${this.onBackdropClick}
      @keydown=${this.onModalKeyDown}
    >
      ${content}
    </div>`;
  }

  private renderChallengeModal() {
    return html`<section
      class="modal"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="challenge-title"
    >
      <button
        type="button"
        class="icon-button modal__close"
        aria-label="Cerrar desafío"
        @click=${this.closeModal}
      >
        ${icon("close")}
      </button>
      <p class="eyebrow">Pon a prueba tu intuición</p>
      <h2 id="challenge-title">Desafío estadístico</h2>
      <p>
        ¿Cuántas simulaciones hacen falta para tener un 50 % de probabilidad de observar el evento
        de la cúspide?
      </p>
      <label class="challenge-input"
        ><span>Número de simulaciones</span
        ><input
          type="number"
          min="1"
          step="1"
          inputmode="numeric"
          .value=${this.challengeGuess}
          @input=${this.onChallengeInput}
      /></label>
      ${this.challengeError ? html`<p class="form-error" role="alert">${this.challengeError}</p>` : nothing}
      <button type="button" class="primary-action modal__action" @click=${this.checkChallenge}>
        Comprobar estimación
      </button>
      ${this.challengeResult ? this.renderChallengeResult(this.challengeResult) : html`<p class="challenge-hint">Pista: la proporción de la cúspide es 1 de cada 641 eventos.</p>`}
    </section>`;
  }

  private renderChallengeResult(result: ChallengeEvaluation) {
    const messages = {
      excellent: "Excelente intuición estadística",
      close: "Te has acercado mucho",
      learning: "La estadística sorprende",
    } as const;
    return html`<div class="challenge-result result-${result.band}" aria-live="polite">
      ${icon(result.band === "excellent" ? "target" : "info")}
      <div>
        <h3>${messages[result.band]}</h3>
        <p>
          El objetivo del 50 % se alcanza en ${result.expected} simulaciones. La media de espera, en
          cambio, es de ${result.mean}.
        </p>
      </div>
    </div>`;
  }

  private renderExtendedModal() {
    return html`<section
      class="modal"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="extended-title"
    >
      <span class="modal__symbol outcome-fatality">${icon("fatality")}</span>
      <p class="eyebrow">Contenido sensible</p>
      <h2 id="extended-title">Modelo extendido</h2>
      <p>
        Esta adaptación didáctica incorpora una fatalidad en la cúspide. No forma parte de la
        proporción histórica original de Bird y se presenta con finalidad educativa.
      </p>
      <div class="modal__actions">
        <button type="button" class="secondary-action" @click=${this.closeModal}>Volver</button
        ><button type="button" class="primary-action" @click=${this.acknowledgeExtended}>
          Comprendo, continuar
        </button>
      </div>
    </section>`;
  }

  private renderLevelDetailModal() {
    const state = this.controller?.state;
    if (!state || !this.selectedOutcomeId) return nothing;
    const model = MODELS[state.activeModelId];
    const outcome = model.outcomes.find((item) => item.id === this.selectedOutcomeId);
    if (!outcome) return nothing;
    const theoreticalTotal = model.outcomes.reduce((sum, item) => sum + item.weight, 0);
    const observedTotal = Object.values(state.totals[state.activeModelId]).reduce<number>(
      (sum, count) => sum + (count ?? 0),
      0,
    );
    const observedCount = state.totals[state.activeModelId][outcome.id] ?? 0;
    const observedPercentage = observedTotal === 0 ? 0 : (observedCount / observedTotal) * 100;

    return html`<section
      class="modal level-detail-modal"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-detail-title"
    >
      <button
        type="button"
        class="icon-button modal__close"
        aria-label="Cerrar detalle"
        @click=${this.closeModal}
      >
        ${icon("close")}
      </button>
      <span class="modal__symbol outcome-${outcome.colorToken}"
        >${icon(levelIconNames[outcome.icon])}</span
      >
      <p class="eyebrow">Detalle del nivel</p>
      <h2 id="level-detail-title">${outcome.label}</h2>
      <dl class="level-detail-stats">
        <div>
          <dt>Proporción teórica</dt>
          <dd>
            ${outcome.weight} de ${theoreticalTotal}
            (${this.formatPercentage((outcome.weight / theoreticalTotal) * 100)})
          </dd>
        </div>
        <div>
          <dt>Resultado observado</dt>
          <dd>
            ${observedCount} de ${observedTotal} (${this.formatPercentage(observedPercentage)})
          </dd>
        </div>
      </dl>
      <div class="level-detail-guidance">
        <h3>Lectura preventiva</h3>
        <p>${this.preventiveExplanation(outcome.id)}</p>
      </div>
      <button type="button" class="primary-action modal__action" @click=${this.closeModal}>
        Entendido
      </button>
    </section>`;
  }

  private renderResetModal() {
    return html`<section
      class="modal"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-title"
    >
      <span class="modal__symbol">${icon("alert")}</span>
      <p class="eyebrow">Acción irreversible</p>
      <h2 id="reset-title">Borrar estadísticas</h2>
      <p>
        Se eliminarán todos los conteos y las 500 ejecuciones guardadas. Tus logros y ajustes no
        cambiarán.
      </p>
      ${this.resetError ? html`<p class="form-error" role="alert">${this.resetError}</p>` : nothing}
      <div class="modal__actions">
        <button type="button" class="secondary-action" @click=${this.closeModal}>Cancelar</button
        ><button type="button" class="danger-action" @click=${this.confirmReset}>
          Borrar definitivamente
        </button>
      </div>
    </section>`;
  }

  private onTabSelect(event: CustomEvent<AppTab>): void {
    this.activeTab = event.detail;
    void this.telemetry?.log("screen_view", { screen: event.detail });
    requestAnimationFrame(() => this.querySelector("h1")?.focus({ preventScroll: true }));
  }

  private onModelSelect(event: CustomEvent<ModelId>): void {
    const modelId = event.detail;
    if (
      modelId === "didactic-extended" &&
      !this.controller?.state.settings.extendedContentAcknowledged
    ) {
      this.pendingModel = modelId;
      this.showModal("extended");
      return;
    }
    this.controller?.setModel(modelId);
    void this.telemetry?.log("model_selected", { model_id: modelId });
  }

  private async onSimulate(event: CustomEvent<SimulationBatchSize>): Promise<void> {
    const run = await this.controller?.run(event.detail);
    if (!run) return;
    if (this.controller?.state.settings.haptics) void this.hapticFeedback?.();
    void this.telemetry?.log("simulation_run", {
      model_id: run.modelId,
      iterations: run.iterations,
    });
    this.announcement = `${run.iterations} ${run.iterations === 1 ? "evento simulado" : "eventos simulados"}. Convergencia ${(run.convergenceScore * 100).toFixed(1)} por ciento.`;
  }

  private openChallenge(): void {
    this.challengeResult = null;
    this.challengeError = "";
    this.showModal("challenge");
  }

  private openReset(): void {
    this.resetError = "";
    this.showModal("reset");
  }

  private openLevelDetail(event: CustomEvent<OutcomeId>): void {
    this.selectedOutcomeId = event.detail;
    this.showModal("level-detail");
  }

  public requestStatisticsReset(): void {
    if (this.controller?.state.settings.shakeToReset) this.openReset();
  }

  private closeModal(): void {
    const returnFocus = this.modalReturnFocus;
    this.modal = null;
    this.pendingModel = null;
    this.selectedOutcomeId = null;
    this.modalReturnFocus = undefined;
    void this.updateComplete.then(() => returnFocus?.focus({ preventScroll: true }));
  }

  private showModal(modal: Exclude<BirdApp["modal"], null>): void {
    if (!this.modal && document.activeElement instanceof HTMLElement) {
      this.modalReturnFocus = document.activeElement;
    }
    this.modal = modal;
  }

  private onModalKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      this.closeModal();
      return;
    }
    if (event.key !== "Tab") return;
    const modal = this.querySelector<HTMLElement>(".modal");
    if (!modal) return;
    const focusable = [
      ...modal.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ),
    ];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) {
      event.preventDefault();
      modal.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private formatPercentage(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    const formatted = Number.isInteger(rounded)
      ? String(rounded)
      : rounded.toFixed(1).replace(".", ",");
    return `${formatted} %`;
  }

  private preventiveExplanation(outcomeId: OutcomeId): string {
    const explanations: Record<OutcomeId, string> = {
      "near-miss":
        "Cada cuasi-accidente es una señal para actuar antes de que el peligro cause daño: registra el evento, elimina la causa y comparte el aprendizaje.",
      "property-damage":
        "El daño material revela una pérdida de control. Aísla el peligro, revisa el procedimiento y corrige las barreras antes de reanudar el trabajo.",
      "minor-injury":
        "Una lesión menor requiere atención y aprendizaje. Investiga sus causas sin buscar culpables y aplica medidas que eviten una repetición más grave.",
      "serious-injury":
        "Una lesión grave exige detener la actividad, proteger a las personas y revisar de forma integral las medidas técnicas, organizativas y formativas.",
      fatality:
        "La fatalidad se presenta solo en la adaptación didáctica. La prioridad preventiva es eliminar los riesgos críticos y verificar siempre las barreras esenciales.",
    };
    return explanations[outcomeId];
  }

  private onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) this.closeModal();
  }

  private onChallengeInput(event: Event): void {
    this.challengeGuess = (event.target as HTMLInputElement).value;
    this.challengeError = "";
  }

  private checkChallenge(): void {
    try {
      this.challengeResult = evaluateChallenge(Number(this.challengeGuess));
      this.challengeError = "";
    } catch {
      this.challengeResult = null;
      this.challengeError = "Introduce un número entero mayor que cero.";
    }
  }

  private async acknowledgeExtended(): Promise<void> {
    await this.controller?.updateSettings({ extendedContentAcknowledged: true });
    this.controller?.setModel(this.pendingModel ?? "didactic-extended");
    void this.telemetry?.log("model_selected", { model_id: "didactic-extended" });
    this.closeModal();
  }

  private async onSettingChange(
    event: CustomEvent<Partial<Omit<SettingsState, "version">>>,
  ): Promise<void> {
    const persisted = (await this.controller?.updateSettings(event.detail)) ?? false;
    let restartRequired = false;
    if (event.detail.analyticsConsent && event.detail.analyticsConsent !== "unknown") {
      restartRequired =
        (await this.telemetry?.applyConsent(event.detail.analyticsConsent))?.restartRequired ??
        false;
    }
    this.announcement = persisted
      ? restartRequired
        ? "Preferencia guardada y aplicada. El estado completo de la telemetría se confirmará al reiniciar la aplicación."
        : "Preferencia guardada."
      : "Preferencia aplicada solo durante esta sesión; el guardado local no está disponible.";
  }

  private async confirmReset(): Promise<void> {
    const reset = (await this.controller?.resetStatistics()) ?? false;
    if (!reset) {
      this.resetError =
        "No se pudieron borrar todos los datos guardados. Reinténtalo antes de cerrar la app.";
      this.announcement = this.resetError;
      return;
    }
    this.closeModal();
    this.announcement = "Estadísticas borradas.";
  }

  private async onShareRequest(): Promise<void> {
    const run = this.controller?.state.latestRun;
    if (!run || !this.shareLatest) return;
    try {
      await this.shareLatest(run);
      this.announcement = "Tarjeta de resultado preparada para compartir.";
      void this.telemetry?.log("share_result", { result: "opened" });
    } catch (error) {
      this.announcement = "No se pudo compartir la tarjeta de resultado.";
      await this.telemetry?.recordError(error);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "bird-app": BirdApp;
  }
}
