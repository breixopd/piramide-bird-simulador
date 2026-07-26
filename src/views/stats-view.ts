import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import type { AppState } from "../app-controller";
import "../components/convergence-chart";
import "../components/count-up";
import { icon } from "../components/app-icon";
import { MODELS, type ModelId } from "../domain/models";

@customElement("stats-view")
export class StatsView extends LitElement {
  @property({ attribute: false }) state?: AppState;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected render() {
    if (!this.state) return null;
    const activeModel = MODELS[this.state.activeModelId];
    const totals = this.state.totals[this.state.activeModelId];
    const totalEvents = Object.values(totals).reduce<number>((sum, count) => sum + (count ?? 0), 0);
    const modelHistory = this.state.history.filter(({ modelId }) => modelId === activeModel.id);
    const latestConvergence = modelHistory[0]?.convergenceScore ?? 0;
    const learning = this.state.progress;
    const learningAccuracy =
      learning.questionsAnswered === 0
        ? 0
        : Math.round((learning.correctAnswers / learning.questionsAnswered) * 100);

    return html`<section class="view stats-view" aria-labelledby="stats-title">
      <header class="page-header">
        <p class="eyebrow">Resultados acumulados</p>
        <h1 id="stats-title" tabindex="-1">Estadísticas</h1>
        <p>Compara tus resultados con la proporción teórica del modelo.</p>
      </header>

      <div class="compact-model-switch" role="group" aria-label="Estadísticas por modelo">
        ${Object.values(MODELS).map(
          (model) =>
            html`<button
              type="button"
              aria-pressed=${this.state?.activeModelId === model.id ? "true" : "false"}
              class=${this.state?.activeModelId === model.id ? "is-active" : ""}
              @click=${() => this.selectModel(model.id)}
            >
              ${model.label}
            </button>`,
        )}
      </div>

      ${
        totalEvents === 0
          ? html`<div class="empty-state">
              ${icon("bars")}
              <h2>Aún no hay simulaciones</h2>
              <p>Vuelve a Inicio y ejecuta tu primer lote para ver la convergencia.</p>
            </div>`
          : html`<div class="stats-overview">
                <article>
                  <span>Eventos totales</span>
                  <strong><count-up .value=${totalEvents} duration=${1500}></count-up></strong>
                </article>
                <article>
                  <span>Última convergencia</span>
                  <strong
                    ><count-up
                      .value=${Math.round(latestConvergence * 1000) / 10}
                      .decimals=${1}
                      .suffix=${" %"}
                      duration=${1500}
                    ></count-up
                  ></strong>
                </article>
                <article>
                  <span>Lotes retenidos</span>
                  <strong
                    ><count-up .value=${modelHistory.length} duration=${800}></count-up
                  ></strong>
                </article>
              </div>

              <section class="stats-section learning-stats" aria-labelledby="learning-stats-title">
                <p class="eyebrow">Aprendizaje preventivo</p>
                <h2 id="learning-stats-title">Tus respuestas sobre peligros</h2>
                <div class="learning-stats-grid">
                  <article>
                    <span>Preguntas respondidas</span>
                    <strong>${learning.questionsAnswered.toLocaleString("es-ES")}</strong>
                  </article>
                  <article>
                    <span>Precisión</span>
                    <strong>${learningAccuracy} %</strong>
                  </article>
                  <article>
                    <span>Mejor racha</span>
                    <strong>${learning.bestCorrectStreak}</strong>
                  </article>
                  <article>
                    <span>Casos explorados</span>
                    <strong>${learning.answeredScenarioIds.length}</strong>
                  </article>
                </div>
                <p class="learning-stats__hint">
                  ${
                    learning.questionsAnswered === 0
                      ? "Responde la pregunta del próximo caso para empezar a medir tu aprendizaje."
                      : html`${learning.correctAnswers.toLocaleString("es-ES")} respuestas correctas
                        de ${learning.questionsAnswered.toLocaleString("es-ES")}.`
                  }
                </p>
              </section>

              <section class="stats-section" aria-labelledby="distribution-title">
                <div class="section-heading">
                  <div>
                    <p class="eyebrow">Distribución</p>
                    <h2 id="distribution-title">Resultado por nivel (total histórico)</h2>
                  </div>
                </div>
                <div class="distribution-list">
                  ${activeModel.outcomes.map((outcome) => {
                    const count = totals[outcome.id] ?? 0;
                    const percentage = totalEvents === 0 ? 0 : (count / totalEvents) * 100;
                    return html`<div class="distribution-row outcome-${outcome.colorToken}">
                      <div>
                        <span class="distribution-dot"></span><strong>${outcome.label}</strong
                        ><span>${count.toLocaleString("es-ES")}</span>
                      </div>
                      <div
                        class="distribution-track"
                        aria-label="${outcome.label}: ${percentage.toFixed(1)} %"
                      >
                        <span style=${`width:${percentage}%`}></span>
                      </div>
                    </div>`;
                  })}
                </div>
              </section>

              <section class="stats-section" aria-labelledby="convergence-title">
                <p class="eyebrow">Evolución</p>
                <h2 id="convergence-title">Proporciones observadas recientes</h2>
                <convergence-chart
                  .history=${this.state.history}
                  .modelId=${activeModel.id}
                ></convergence-chart>
                <p class="chart-legend-note">
                  El gráfico usa los lotes recientes retenidos (hasta 500); la distribución superior
                  usa el total histórico. Color continuo: resultado observado. Color discontinuo:
                  proporción teórica.
                </p>
              </section>

              <section class="stats-section" aria-labelledby="history-title">
                <p class="eyebrow">Últimas ejecuciones</p>
                <h2 id="history-title">Historial</h2>
                <ol class="history-list">
                  ${modelHistory.slice(0, 20).map(
                    (run) =>
                      html`<li>
                        <span
                          >${new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(run.createdAt))}</span
                        >
                        <strong
                          >${run.iterations.toLocaleString("es-ES")}
                          ${run.iterations === 1 ? "evento" : "eventos"}</strong
                        >
                        <span>${(run.convergenceScore * 100).toFixed(1)} %</span>
                      </li>`,
                  )}
                </ol>
              </section>`
      }
    </section>`;
  }

  private selectModel(modelId: ModelId): void {
    this.dispatchEvent(new CustomEvent("model-select", { detail: modelId, bubbles: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "stats-view": StatsView;
  }
}
