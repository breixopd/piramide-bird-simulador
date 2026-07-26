import { LitElement, html, svg, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import type { OutcomeDefinition, OutcomeId, SimulationModel } from "../domain/models";
import { distance, type GesturePoint } from "../domain/gestures";

// SVG triangle geometry. The apex band gets extra height for legible text,
// while every outside vertex follows the same line from the apex to the base.
// viewBox 300 × 280; apex at (150,20); base corners at (22,260)/(278,260).
const VIEW_W = 300;
const APEX_X = 150;
const TOP_Y = 20;
const BOTTOM_Y = 260;
const HALF_BASE = 128;
const FOUR_BAND_OFFSETS = [0, 75, 135, 180, 240] as const;

/** Half-width of the triangular silhouette at a given y (linear taper). */
function halfWidthAt(y: number): number {
  const t = (y - TOP_Y) / (BOTTOM_Y - TOP_Y);
  return HALF_BASE * t;
}

interface BandGeometry {
  /** SVG path "d" for the trapezoid band. */
  readonly d: string;
  /** Horizontal center (always apex X). */
  readonly cx: number;
  /** Y for the weight numeral. */
  readonly weightY: number;
  /** Y for the label text. */
  readonly labelY: number;
}

function bandGeometry(index: number, count: number): BandGeometry {
  const totalHeight = BOTTOM_Y - TOP_Y;
  const y0 =
    count === 4 ? TOP_Y + FOUR_BAND_OFFSETS[index]! : TOP_Y + (index * totalHeight) / count;
  const y1 =
    count === 4
      ? TOP_Y + FOUR_BAND_OFFSETS[index + 1]!
      : TOP_Y + ((index + 1) * totalHeight) / count;
  const hw0 = halfWidthAt(y0);
  const hw1 = halfWidthAt(y1);
  // Top-left, top-right, bottom-right, bottom-left.
  const d = `M${APEX_X - hw0},${y0} L${APEX_X + hw0},${y0} L${APEX_X + hw1},${y1} L${APEX_X - hw1},${y1} Z`;
  const midY = (y0 + y1) / 2;
  const labelY = index === 0 ? y1 - 7 : midY + 16;
  const weightY = index === 0 ? labelY - 18 : midY - 2;
  return { d, cx: APEX_X, weightY, labelY };
}

@customElement("bird-pyramid")
export class BirdPyramid extends LitElement {
  @property({ attribute: false }) model?: SimulationModel;
  @property({ type: String }) highlighted?: OutcomeId;

  private longPressTimer?: ReturnType<typeof setTimeout>;
  private pressStart?: GesturePoint;
  private suppressClickUntil = 0;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected render() {
    if (!this.model) return nothing;
    // Render apex-first (reversed) so index 0 is the narrow top.
    const bands = [...this.model.outcomes].reverse();
    return html`<svg
      class="pyramid"
      viewBox="0 0 ${VIEW_W} 280"
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label="Proporciones del modelo ${this.model.label}"
    >
      ${bands.map((outcome, index) => this.renderBand(outcome, index, bands.length))}
    </svg>`;
  }

  private renderBand(outcome: OutcomeDefinition, index: number, count: number) {
    const g = bandGeometry(index, count);
    const isHighlighted = this.highlighted === outcome.id;
    return svg`<g
      class="pyramid__level outcome-${outcome.colorToken} ${isHighlighted ? "is-highlighted" : ""}"
      role="button"
      tabindex="0"
      aria-label="Ver detalle de ${outcome.label}"
      @click=${() => this.onBandClick(outcome.id)}
      @keydown=${(e: KeyboardEvent) => this.onBandKeyDown(e, outcome.id)}
      @pointerdown=${(e: PointerEvent) => this.startLongPress(e, outcome.id)}
      @pointermove=${this.onPointerMove}
      @pointerup=${this.cancelLongPress}
      @pointercancel=${this.cancelLongPress}
      @pointerleave=${this.cancelLongPress}
    >
      <title>Ver detalle de ${outcome.label}</title>
      <path d=${g.d} />
      <text x=${g.cx} y=${g.weightY} text-anchor="middle" class="pyramid__weight">${outcome.weight}</text>
      <text
        x=${g.cx}
        y=${g.labelY}
        text-anchor="middle"
        class="pyramid__label"
      >${outcome.label}</text>
    </g>`;
  }

  private onBandClick(outcomeId: OutcomeId): void {
    if (Date.now() <= this.suppressClickUntil) {
      this.suppressClickUntil = 0;
      return;
    }
    this.openDetail(outcomeId);
  }

  private onBandKeyDown(event: KeyboardEvent, outcomeId: OutcomeId): void {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    this.openDetail(outcomeId);
  }

  private startLongPress(event: PointerEvent, outcomeId: OutcomeId): void {
    if (event.button !== undefined && event.button !== 0 && event.pointerType !== "touch") return;
    this.cancelLongPress();
    this.pressStart = { x: event.clientX, y: event.clientY };
    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = undefined;
      this.suppressClickUntil = Date.now() + 800;
      this.openDetail(outcomeId);
    }, 500);
  }

  private onPointerMove(event: PointerEvent): void {
    if (this.pressStart && distance(this.pressStart, { x: event.clientX, y: event.clientY }) > 10) {
      this.suppressClickUntil = Date.now() + 800;
      this.cancelLongPress();
    }
  }

  private cancelLongPress(): void {
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    this.longPressTimer = undefined;
    this.pressStart = undefined;
  }

  private openDetail(outcomeId: OutcomeId): void {
    this.dispatchEvent(
      new CustomEvent<OutcomeId>("level-detail", {
        detail: outcomeId,
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "bird-pyramid": BirdPyramid;
  }
}
