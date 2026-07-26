import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import type { AppState } from "../app-controller";
import { icon } from "../components/app-icon";
import type { AnalyticsConsent, SettingsState, ThemePreference } from "../platform/settings";

@customElement("info-view")
export class InfoView extends LitElement {
  @property({ attribute: false }) state?: AppState;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected render() {
    if (!this.state) return null;
    return html`<section class="view info-view" aria-labelledby="info-title">
      <header class="page-header">
        <p class="eyebrow">Guía y preferencias</p>
        <h1 id="info-title" tabindex="-1">Información</h1>
        <p>Teoría, accesibilidad y privacidad bajo tu control.</p>
      </header>

      <section class="theory-card" aria-labelledby="theory-title">
        <span class="theory-card__index">01</span>
        <div>
          <p class="eyebrow">Fundamento</p>
          <h2 id="theory-title">Qué explica la pirámide</h2>
          <p>
            Bird relaciona numerosos incidentes sin lesión con un número progresivamente menor de
            sucesos graves. La herramienta ayuda a visualizar proporciones; no predice accidentes
            individuales.
          </p>
        </div>
      </section>

      <section class="settings-section" aria-labelledby="appearance-title">
        <div class="section-heading">
          ${icon("settings")}
          <div>
            <p class="eyebrow">Preferencias</p>
            <h2 id="appearance-title">Apariencia y movimiento</h2>
          </div>
        </div>
        <label class="select-setting"
          ><span><strong>Tema</strong><small>Claro, oscuro o el del sistema</small></span
          ><select
            aria-label="Tema"
            .value=${this.state.settings.theme}
            @change=${this.changeTheme}
          >
            <option value="system">Sistema</option>
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
          </select></label
        >
        ${this.switchSetting("reducedMotion", "Reducir movimiento", "Desactiva giro, lluvia y destellos")}
        ${this.switchSetting("haptics", "Respuesta háptica", "Vibración sutil en acciones principales")}
        ${this.switchSetting("shakeToReset", "Agitar para reiniciar", "Siempre pide confirmación antes de borrar")}
      </section>

      <section class="settings-section" aria-labelledby="privacy-title">
        <div class="section-heading">
          ${icon("info")}
          <div>
            <p class="eyebrow">Privacidad</p>
            <h2 id="privacy-title">Datos de uso</h2>
          </div>
        </div>
        <p class="settings-copy">
          Firebase Analytics y Crashlytics solo se activan con tu permiso. No se envían relatos ni
          historial; la política detalla los identificadores y diagnósticos técnicos utilizados.
        </p>
        <fieldset class="consent-options">
          <legend>Compartir datos técnicos y seudónimos</legend>
          ${(["granted", "denied"] as const).map((consent) => html`<label><input type="radio" name="analytics" value=${consent} .checked=${this.state?.settings.analyticsConsent === consent} @change=${() => this.setConsent(consent)} /><span>${consent === "granted" ? "Permitir" : "No permitir"}</span></label>`)}
        </fieldset>
        <p class="settings-copy settings-copy--after">
          La preferencia se aplica de inmediato. Reinicia la aplicación para confirmar el estado
          completo de los SDK.
        </p>
        <a class="settings-link" href="./privacy.html" target="_blank" rel="noreferrer">
          Leer la política de privacidad <span aria-hidden="true">→</span>
        </a>
      </section>

      <section class="settings-section danger-zone" aria-labelledby="data-title">
        <div>
          <p class="eyebrow">Datos locales</p>
          <h2 id="data-title">Historial de simulación</h2>
          <p>Elimina conteos e historial. Tus logros y preferencias se conservan.</p>
        </div>
        <button type="button" class="danger-action" @click=${this.requestReset}>
          Borrar estadísticas
        </button>
      </section>

      <footer class="app-footer">
        <strong>Pirámide de Bird Simulador</strong>
        <span
          >v1.0.0-alpha.6 · Desarrollado por
          <a
            class="app-footer__link"
            href="https://github.com/breixopd"
            target="_blank"
            rel="noreferrer"
            >breixopd</a
          ></span
        >
        <p>Recurso educativo. No sustituye una evaluación de riesgos ni asesoramiento técnico.</p>
      </footer>
    </section>`;
  }

  private switchSetting(
    key: "reducedMotion" | "haptics" | "shakeToReset",
    label: string,
    description: string,
  ) {
    const enabled = this.state?.settings[key] ?? false;
    return html`<div class="toggle-setting">
      <span><strong>${label}</strong><small>${description}</small></span
      ><button
        type="button"
        role="switch"
        aria-label=${label}
        aria-checked=${enabled ? "true" : "false"}
        class=${enabled ? "is-on" : ""}
        @click=${() => this.updateSetting({ [key]: !enabled })}
      >
        <span></span>
      </button>
    </div>`;
  }

  private changeTheme(event: Event): void {
    this.updateSetting({ theme: (event.target as HTMLSelectElement).value as ThemePreference });
  }

  private setConsent(analyticsConsent: AnalyticsConsent): void {
    this.updateSetting({ analyticsConsent });
  }

  private updateSetting(patch: Partial<Omit<SettingsState, "version">>): void {
    this.dispatchEvent(new CustomEvent("setting-change", { detail: patch, bubbles: true }));
  }

  private requestReset(): void {
    this.dispatchEvent(new CustomEvent("reset-request", { bubbles: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "info-view": InfoView;
  }
}
