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

  protected render() {
    if (!this.run || this.run.iterations === 1 || this.reducedMotion) return nothing;
    const visible = selectVisibleOutcomes(this.run.counts);
    return html`<div class="event-rain" aria-hidden="true">
      ${visible.map(
        (outcome, index) =>
          html`<span
            class="event-rain__particle outcome-${outcome}"
            style=${`--particle-x:${(index * 37) % 100}%;--particle-delay:${(index % 10) * 35}ms;--particle-turn:${(index % 7) * 17 - 45}deg`}
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
