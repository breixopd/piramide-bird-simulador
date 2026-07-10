import {
  Chart,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { LitElement, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";

import { MODELS, type ModelId, type OutcomeId, type SimulationModel } from "../domain/models";
import type { SimulationRunSummary } from "../platform/history";

Chart.register(LineController, LineElement, LinearScale, PointElement, Tooltip, Legend);

const outcomeColors: Readonly<Record<OutcomeId, string>> = {
  "near-miss": "#527d4b",
  "property-damage": "#858633",
  "minor-injury": "#d4971d",
  "serious-injury": "#c93a2d",
  fatality: "#86241f",
};

interface ConvergenceLine {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  pointRadius: number;
  borderWidth: number;
  borderDash?: number[];
  tension: number;
}

export interface ConvergenceSeries {
  labels: number[];
  datasets: ConvergenceLine[];
}

export function buildConvergenceSeries(
  history: readonly SimulationRunSummary[],
  model: SimulationModel,
): ConvergenceSeries {
  const runs = history
    .filter(({ modelId }) => modelId === model.id)
    .slice()
    .reverse();
  const labels: number[] = [];
  const cumulative: Partial<Record<OutcomeId, number>> = {};
  const observed = new Map<OutcomeId, number[]>(model.outcomes.map(({ id }) => [id, []] as const));
  let eventCount = 0;

  for (const run of runs) {
    eventCount += run.iterations;
    labels.push(eventCount);
    for (const outcome of model.outcomes) {
      cumulative[outcome.id] = (cumulative[outcome.id] ?? 0) + (run.counts[outcome.id] ?? 0);
      observed.get(outcome.id)?.push(((cumulative[outcome.id] ?? 0) / eventCount) * 100);
    }
  }

  const theoreticalTotal = model.outcomes.reduce((sum, { weight }) => sum + weight, 0);
  const datasets = model.outcomes.flatMap((outcome): ConvergenceLine[] => {
    const color = outcomeColors[outcome.id];
    return [
      {
        label: `${outcome.label} · observado`,
        data: observed.get(outcome.id) ?? [],
        borderColor: color,
        backgroundColor: color,
        pointRadius: 2,
        borderWidth: 2,
        tension: 0.2,
      },
      {
        label: `${outcome.label} · teórico`,
        data: labels.map(() => (outcome.weight / theoreticalTotal) * 100),
        borderColor: color,
        backgroundColor: color,
        pointRadius: 0,
        borderWidth: 1,
        borderDash: [5, 4],
        tension: 0,
      },
    ];
  });

  return { labels, datasets };
}

@customElement("convergence-chart")
export class ConvergenceChart extends LitElement {
  @property({ attribute: false }) history: readonly SimulationRunSummary[] = [];
  @property({ type: String }) modelId: ModelId = "bird-classic";
  @query("canvas") private canvas?: HTMLCanvasElement;

  private chart?: Chart<"line", number[], number>;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected render() {
    const model = MODELS[this.modelId];
    const series = buildConvergenceSeries(this.history, model);
    const theoreticalTotal = model.outcomes.reduce((sum, { weight }) => sum + weight, 0);
    return html`<div class="chart-frame">
        <canvas
          aria-label="Proporción observada (%) en lotes recientes retenidos (hasta 500)"
          role="img"
          width="620"
          height="260"
        ></canvas>
      </div>
      <ul
        class="sr-only"
        aria-label="Datos de proporción observada por nivel en lotes recientes retenidos (hasta 500)"
      >
        ${series.labels.flatMap((events, index) =>
          model.outcomes.map((outcome) => {
            const observed =
              series.datasets.find(({ label }) => label === `${outcome.label} · observado`)?.data[
                index
              ] ?? 0;
            const theoretical = (outcome.weight / theoreticalTotal) * 100;
            return html`<li>
              ${events} eventos: ${outcome.label} observado ${this.formatPercentage(observed)},
              teórico ${this.formatPercentage(theoretical)}.
            </li>`;
          }),
        )}
      </ul>`;
  }

  protected updated(): void {
    this.drawChart();
  }

  disconnectedCallback(): void {
    this.chart?.destroy();
    super.disconnectedCallback();
  }

  private drawChart(): void {
    const context = this.canvas?.getContext("2d");
    if (!context) return;
    const model = MODELS[this.modelId];
    const series = buildConvergenceSeries(this.history, model);
    this.chart?.destroy();
    this.chart = new Chart(context, {
      type: "line",
      data: series,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 18,
              boxHeight: 2,
              padding: 12,
              filter: (item) => !item.text.endsWith("· teórico"),
            },
          },
          tooltip: { enabled: true },
        },
        scales: {
          x: {
            type: "linear",
            min: 0,
            title: { display: true, text: "Eventos acumulados" },
          },
          y: {
            type: "linear",
            min: 0,
            max: 100,
            title: { display: true, text: "Proporción observada (%)" },
          },
        },
      },
    });
  }

  private formatPercentage(value: number): string {
    return `${value.toFixed(1).replace(".", ",")} %`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "convergence-chart": ConvergenceChart;
  }
}
