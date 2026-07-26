import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

/**
 * Animates a number from 0 (or the previous value) to the target value,
 * then displays it formatted. Respects reduced-motion (snaps instantly).
 * Used for convergence %, stat totals, and event counts.
 */
@customElement("count-up")
export class CountUp extends LitElement {
  @property({ type: Number }) value = 0;
  @property({ type: Number }) duration = 1400;
  /** Suffix appended after the number (e.g. " %"). */
  @property({ type: String }) suffix = "";
  /** Locale for number formatting. */
  @property({ type: String }) locale = "es-ES";
  /** Maximum fraction digits. */
  @property({ type: Number }) decimals = 0;

  @state() private displayed = 0;
  private hasInitialized = false;
  private initializingThisUpdate = false;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private rafId?: number;
  private animFrame = 0;

  protected willUpdate(changed: Map<string, unknown>): void {
    this.initializingThisUpdate = changed.has("value") && !this.hasInitialized;
    if (this.initializingThisUpdate) {
      this.hasInitialized = true;
      this.displayed = this.value;
    }
  }

  protected updated(changed: Map<string, unknown>): void {
    if (!changed.has("value")) return;
    if (this.initializingThisUpdate) {
      this.initializingThisUpdate = false;
      return;
    }
    const reduced =
      this.closest("bird-app")?.getAttribute("data-motion") === "reduced" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof this.value !== "number") {
      this.displayed = this.value;
      return;
    }
    this.animateTo(this.value);
  }

  private animateTo(target: number): void {
    // In environments without requestAnimationFrame (e.g. jsdom), snap instantly.
    if (typeof requestAnimationFrame !== "function") {
      this.displayed = target;
      return;
    }
    cancelAnimationFrame(this.rafId ?? 0);
    const start = this.displayed;
    const delta = target - start;
    if (delta === 0) return;
    const startTime = performance.now();
    const dur = this.duration;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / dur, 1);
      // Ease-out cubic for a satisfying deceleration.
      const eased = 1 - Math.pow(1 - t, 3);
      this.displayed = start + delta * eased;
      this.animFrame++;
      if (t < 1) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.displayed = target;
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  disconnectedCallback(): void {
    cancelAnimationFrame(this.rafId ?? 0);
    super.disconnectedCallback();
  }

  protected render() {
    const formatted = this.displayed.toLocaleString(this.locale, {
      minimumFractionDigits: this.decimals,
      maximumFractionDigits: this.decimals,
    });
    return html`<span>${formatted}${this.suffix}${nothing}</span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "count-up": CountUp;
  }
}
