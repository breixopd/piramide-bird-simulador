import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import { icon } from "./app-icon";

export type AppTab = "home" | "stats" | "achievements" | "info";

const tabs = [
  { id: "home", label: "Inicio", accessibleLabel: "Inicio", icon: "home" },
  { id: "stats", label: "Stats", accessibleLabel: "Estadísticas", icon: "bars" },
  { id: "achievements", label: "Logros", accessibleLabel: "Logros", icon: "trophy" },
  { id: "info", label: "Info", accessibleLabel: "Información y ajustes", icon: "info" },
] as const;

@customElement("bottom-nav")
export class BottomNav extends LitElement {
  @property({ type: String }) active: AppTab = "home";
  @property({ type: Boolean }) running = false;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected render() {
    return html`<nav class="bottom-nav" aria-label="Navegación principal">
      ${tabs.slice(0, 2).map((tab) => this.renderTab(tab))}
      <button
        type="button"
        class="bottom-nav__launch"
        aria-label="Lanzar un evento rápido"
        ?disabled=${this.running}
        @click=${this.quickLaunch}
      >
        <span>${icon("cube")}</span><small>Lanzar</small>
      </button>
      ${tabs.slice(2).map((tab) => this.renderTab(tab))}
    </nav>`;
  }

  private renderTab(tab: (typeof tabs)[number]) {
    return html`<button
      type="button"
      class="bottom-nav__item ${this.active === tab.id ? "is-active" : ""}"
      aria-label=${tab.accessibleLabel}
      aria-current=${this.active === tab.id ? "page" : "false"}
      @click=${() => this.selectTab(tab.id)}
    >
      ${icon(tab.icon)}<span>${tab.label}</span>
    </button>`;
  }

  private selectTab(tab: AppTab): void {
    this.dispatchEvent(new CustomEvent<AppTab>("tab-select", { detail: tab, bubbles: true }));
  }

  private quickLaunch(): void {
    this.dispatchEvent(new CustomEvent("simulate", { detail: 1, bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "bottom-nav": BottomNav;
  }
}
