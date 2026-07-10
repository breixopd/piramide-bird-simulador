import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import type { OutcomeDefinition, OutcomeId, SimulationModel } from "../domain/models";
import { distance, type GesturePoint } from "../domain/gestures";
import { icon } from "./app-icon";

const iconNames = {
  warning: "alert",
  damage: "damage",
  bandage: "bandage",
  medical: "medical",
  fatality: "fatality",
} as const;

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
    if (!this.model) return null;
    return html`<ol class="pyramid" aria-label="Proporciones del modelo ${this.model.label}">
      ${[...this.model.outcomes]
        .reverse()
        .map((outcome, index, outcomes) => this.renderLevel(outcome, index, outcomes.length))}
    </ol>`;
  }

  private renderLevel(outcome: OutcomeDefinition, index: number, length: number) {
    const width = 42 + (index / Math.max(length - 1, 1)) * 58;
    return html`<li class="pyramid__item">
      <button
        type="button"
        class="pyramid__level outcome-${outcome.colorToken} ${
          this.highlighted === outcome.id ? "is-highlighted" : ""
        }"
        style=${`--level-width:${width}%`}
        aria-label="Ver detalle de ${outcome.label}"
        title="Mantén pulsado o toca para ver el detalle de ${outcome.label}"
        @click=${() => this.onLevelClick(outcome.id)}
        @pointerdown=${(event: PointerEvent) => this.startLongPress(event, outcome.id)}
        @pointermove=${this.onPointerMove}
        @pointerup=${this.cancelLongPress}
        @pointercancel=${this.cancelLongPress}
        @pointerleave=${this.cancelLongPress}
      >
        <span class="pyramid__icon">${icon(iconNames[outcome.icon])}</span>
        <span class="pyramid__label">${outcome.label}</span>
        <strong class="pyramid__weight">${outcome.weight}</strong>
      </button>
    </li>`;
  }

  private onLevelClick(outcomeId: OutcomeId): void {
    if (Date.now() <= this.suppressClickUntil) {
      this.suppressClickUntil = 0;
      return;
    }
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
