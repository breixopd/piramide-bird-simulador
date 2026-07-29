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

const fallbackOutcomeColors: Readonly<Record<OutcomeId, string>> = {
  "near-miss": "#0284c7",
  "property-damage": "#15803d",
  "minor-injury": "#c2410c",
  "serious-injury": "#9f1239",
  fatality: "#4b5563",
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
  colors: Readonly<Record<OutcomeId, string>> = fallbackOutcomeColors,
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
    const color = colors[outcome.id];
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
    const colors = Object.fromEntries(
      (Object.keys(fallbackOutcomeColors) as OutcomeId[]).map((outcome) => [
        outcome,
        this.readThemeColor(`--outcome-${outcome}`, fallbackOutcomeColors[outcome]),
      ]),
    ) as Record<OutcomeId, string>;
    const series = buildConvergenceSeries(this.history, model, colors);
    const inkSoft = this.readThemeColor("--ink-soft", "#91a6b9");
    const ink = this.readThemeColor("--ink", "#c4d1dc");
    const surface = this.readThemeColor("--surface", "#07111d");
    const line = this.readThemeColor("--line", "#263e55");
    const lineStrong = this.readThemeColor("--line-strong", "#3c5a72");
    this.chart?.destroy();
    this.chart = new Chart(context, {
      type: "line",
      data: series,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: { padding: { top: 4, right: 8, bottom: 0, left: 4 } },
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: inkSoft,
              boxWidth: 10,
              boxHeight: 10,
              padding: 10,
              usePointStyle: true,
              pointStyle: "circle",
              font: { size: 11, weight: 600 },
              filter: (item) => !item.text.endsWith("· teórico"),
            },
          },
          tooltip: {
            enabled: true,
            mode: "index",
            intersect: false,
            backgroundColor: surface,
            titleColor: ink,
            bodyColor: inkSoft,
            borderColor: lineStrong,
            borderWidth: 1,
            cornerRadius: 8,
            padding: 10,
            boxPadding: 4,
            titleFont: { size: 12, weight: 700 },
            bodyFont: { size: 11 },
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${(ctx.parsed.y ?? 0).toFixed(1)} %`,
            },
          },
        },
        scales: {
          x: {
            type: "linear",
            min: 0,
            ticks: {
              color: inkSoft,
              font: { size: 10 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 6,
            },
            grid: { color: line, tickLength: 4 },
            border: { color: lineStrong },
            title: {
              display: true,
              text: "Eventos acumulados",
              color: inkSoft,
              font: { size: 10 },
            },
          },
          y: {
            type: "linear",
            min: 0,
            max: 100,
            ticks: {
              color: inkSoft,
              font: { size: 11 },
              callback: (v) => `${v} %`,
              maxTicksLimit: 6,
            },
            grid: { color: line },
            border: { color: lineStrong },
            title: {
              display: true,
              text: "Proporción observada (%)",
              color: inkSoft,
              font: { size: 10 },
            },
          },
        },
        elements: {
          point: { radius: 2, hitRadius: 16, hoverRadius: 5 },
          line: { borderWidth: 2 },
        },
      },
    });
  }

  private readThemeColor(propertyName: string, fallback: string): string {
    return getComputedStyle(this).getPropertyValue(propertyName).trim() || fallback;
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
