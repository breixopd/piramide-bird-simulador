import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import type { AppState } from "../app-controller";
import { icon, type AppIconName } from "../components/app-icon";
import { ACHIEVEMENTS } from "../domain/progress";

const achievementIcons: Record<string, AppIconName> = {
  play: "play",
  alert: "alert",
  target: "target",
  streak: "bars",
  bulk: "bulk",
};

@customElement("achievements-view")
export class AchievementsView extends LitElement {
  @property({ attribute: false }) state?: AppState;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected render() {
    const unlocked = new Set(this.state?.progress.unlocked ?? []);
    return html`<section class="view achievements-view" aria-labelledby="achievements-title">
      <header class="page-header">
        <p class="eyebrow">Aprendizaje</p>
        <h1 id="achievements-title" tabindex="-1">Logros</h1>
        <p>${unlocked.size} de ${ACHIEVEMENTS.length} hitos desbloqueados.</p>
      </header>
      <div
        class="achievement-progress"
        aria-label="${unlocked.size} de ${ACHIEVEMENTS.length} logros"
      >
        <span style=${`width:${(unlocked.size / ACHIEVEMENTS.length) * 100}%`}></span>
      </div>
      <div class="achievement-list">
        ${ACHIEVEMENTS.map((achievement, index) => {
          const isUnlocked = unlocked.has(achievement.id);
          return html`<article class="achievement ${isUnlocked ? "is-unlocked" : "is-locked"}">
            <div class="achievement__number">${String(index + 1).padStart(2, "0")}</div>
            <div class="achievement__icon">
              ${icon(achievementIcons[achievement.icon] ?? "trophy")}
            </div>
            <div>
              <p class="achievement__status">${isUnlocked ? "Desbloqueado" : "Pendiente"}</p>
              <h2>${achievement.name}</h2>
              <p>${achievement.description}</p>
            </div>
            <span class="achievement__mark"
              >${isUnlocked ? icon("check", "Desbloqueado") : "—"}</span
            >
          </article>`;
        })}
      </div>
      <aside class="learning-note">
        ${icon("info")}
        <p>Los logros señalan conceptos aprendidos. Una consecuencia grave nunca es un premio.</p>
      </aside>
    </section>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "achievements-view": AchievementsView;
  }
}
