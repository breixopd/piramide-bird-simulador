import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import type { OutcomeId } from "../domain/models";
import type { SimulationRunSummary } from "../platform/history";
import { icon } from "./app-icon";

const names = {
  "near-miss": "alert",
  "property-damage": "damage",
  "minor-injury": "bandage",
  "serious-injury": "medical",
  fatality: "fatality",
} as const;

export function selectVisibleOutcomes(
  counts: Readonly<Partial<Record<OutcomeId, number>>>,
  maximum = 100,
): OutcomeId[] {
  const entries = Object.entries(counts)
    .map(([outcome, count]) => ({ outcome: outcome as OutcomeId, count: count ?? 0, visible: 0 }))
    .filter(({ count }) => count > 0);
  if (entries.length === 0 || maximum <= 0) return [];

  const target = Math.min(
    maximum,
    entries.reduce((sum, { count }) => sum + count, 0),
  );
  for (const entry of entries.slice(0, target)) entry.visible = 1;
  let assigned = entries.reduce((sum, { visible }) => sum + visible, 0);
  while (assigned < target) {
    const candidate = entries
      .filter(({ count, visible }) => visible < count)
      .sort(
        (left, right) => right.count / (right.visible + 1) - left.count / (left.visible + 1),
      )[0];
    if (!candidate) break;
    candidate.visible += 1;
    assigned += 1;
  }

  const result: OutcomeId[] = [];
  while (result.length < target) {
    for (const entry of entries) {
      if (entry.visible <= 0) continue;
      result.push(entry.outcome);
      entry.visible -= 1;
      if (result.length === target) break;
    }
  }
  return result;
}

@customElement("event-rain")
export class EventRain extends LitElement {
  @property({ attribute: false }) run: SimulationRunSummary | null = null;
  @property({ type: Boolean }) reducedMotion = false;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected updated(): void {
    if (this.reducedMotion) return;
    const particles = this.querySelectorAll<HTMLElement>(".event-rain__particle");
    const reduced =
      this.closest("bird-app")?.getAttribute("data-motion") === "reduced" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    particles.forEach((particle, index) => {
      if (reduced || typeof particle.animate !== "function") return;
      const drift = Number(particle.dataset.drift ?? ((index % 5) - 2) * 0.4);
      const duration = 900 + ((index * 53) % 700);
      const delay = (index % 12) * 45;
      particle.animate(
        [
          { transform: "translate(0, -1.5rem) rotate(0deg)", opacity: 0 },
          {
            transform: `translate(${drift * 0.5}rem, 4rem) rotate(${drift * 40}deg)`,
            opacity: 1,
            offset: 0.18,
          },
          { transform: `translate(${drift}rem, 16rem) rotate(${drift * 90}deg)`, opacity: 0 },
        ],
        { duration, delay, easing: "cubic-bezier(0.4, 0.1, 0.6, 1)", fill: "forwards" },
      );
    });
  }

  protected render() {
    if (!this.run || this.run.iterations === 1 || this.reducedMotion) return nothing;
    const visible = selectVisibleOutcomes(this.run.counts);
    return html`<div class="event-rain" aria-hidden="true">
      ${visible.map(
        (outcome, index) =>
          html`<span
            class="event-rain__particle outcome-${outcome}"
            data-drift=${((index * 37) % 9) / 10 - 0.4}
            style=${`left:${(index * 37) % 100}%`}
            >${icon(names[outcome])}</span
          >`,
      )}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "event-rain": EventRain;
  }
}
