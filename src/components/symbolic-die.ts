import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import type { OutcomeId } from "../domain/models";
import { icon, type AppIconName } from "./app-icon";

const dieFaces = {
  "near-miss": { icon: "alert", label: "Cuasi-accidente" },
  "property-damage": { icon: "damage", label: "Daño material" },
  "minor-injury": { icon: "bandage", label: "Lesión menor" },
  "serious-injury": { icon: "medical", label: "Lesión grave" },
  fatality: { icon: "fatality", label: "Fatalidad" },
} as const;

const cubeFaces: ReadonlyArray<{
  position: "back" | "right" | "left" | "top" | "bottom";
  outcome: OutcomeId;
  icon: AppIconName;
}> = [
  { position: "back", outcome: "property-damage", icon: "damage" },
  { position: "right", outcome: "minor-injury", icon: "bandage" },
  { position: "left", outcome: "near-miss", icon: "alert" },
  { position: "top", outcome: "serious-injury", icon: "medical" },
  { position: "bottom", outcome: "fatality", icon: "fatality" },
];

@customElement("symbolic-die")
export class SymbolicDie extends LitElement {
  @property({ type: String }) outcome: OutcomeId = "near-miss";
  @property({ type: Boolean }) rolling = false;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected render() {
    const face = dieFaces[this.outcome];
    return html`<div
      class="symbolic-die outcome-${this.outcome} ${this.rolling ? "is-rolling" : ""}"
      role="img"
      aria-label="Dado simbólico: ${face.label}"
    >
      <span class="symbolic-die__face symbolic-die__face--front outcome-${this.outcome}"
        >${icon(face.icon)}</span
      >
      ${cubeFaces.map(
        (cubeFace) =>
          html`<span
            class="symbolic-die__face symbolic-die__face--${cubeFace.position} outcome-${cubeFace.outcome}"
            >${icon(cubeFace.icon)}</span
          >`,
      )}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "symbolic-die": SymbolicDie;
  }
}
