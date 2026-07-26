import { html, nothing, svg, type TemplateResult } from "lit";

export type AppIconName =
  | "alert"
  | "bandage"
  | "bars"
  | "bulk"
  | "check"
  | "close"
  | "cube"
  | "damage"
  | "fatality"
  | "home"
  | "info"
  | "medical"
  | "play"
  | "settings"
  | "share"
  | "target"
  | "trophy";

const paths: Record<AppIconName, TemplateResult> = {
  alert: svg`<path d="M12 3 2.8 20h18.4L12 3Z"></path><path d="M12 8v5.5M12 17h.01"></path>`,
  bandage: svg`<rect x="2" y="9" width="20" height="6" rx="3"></rect
    ><path d="M10 10v4M8 12h4"></path>`,
  bars: svg`<path d="M4 20V10h4v10M10 20V4h4v16M16 20v-7h4v7M2 20h20"></path>`,
  bulk: svg`<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"></path>`,
  check: svg`<path d="m5 12 4 4L19 6"></path>`,
  close: svg`<path d="m6 6 12 12M18 6 6 18"></path>`,
  cube: svg`<path d="m12 2 9 5-9 5-9-5 9-5Z"></path
    ><path d="m3 7 9 5v10l-9-5V7Zm18 0-9 5v10l9-5V7Z"></path>`,
  damage: svg`<path d="M4 8 12 4l8 4v10l-8 4-8-4V8Z"></path><path d="M12 4v8M8 10l4 2 4-2"></path>`,
  fatality: svg`<circle cx="12" cy="7" r="3.5"></circle
    ><path d="M5.5 21v-2.5a6.5 6.5 0 0 1 13 0V21M8.5 12.5l7 7m0-7-7 7"></path>`,
  home: svg`<path d="m3 11 9-8 9 8M5.5 9.5V21h13V9.5M9 21v-6h6v6"></path>`,
  info: svg`<circle cx="12" cy="12" r="9"></circle><path d="M12 11v6M12 7h.01"></path>`,
  medical: svg`<circle cx="12" cy="12" r="9"></circle><path d="M12 7v10M7 12h10"></path>`,
  play: svg`<circle cx="12" cy="12" r="9"></circle><path d="m10 8 6 4-6 4V8Z"></path>`,
  settings: svg`<circle cx="12" cy="12" r="3"></circle
    ><path
      d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"
    ></path>`,
  share: svg`<circle cx="18" cy="5" r="2.5"></circle><circle cx="6" cy="12" r="2.5"></circle
    ><circle cx="18" cy="19" r="2.5"></circle><path d="m8.2 10.8 7.5-4.4M8.2 13.2l7.5 4.4"></path>`,
  target: svg`<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle
    ><circle cx="12" cy="12" r="1"></circle>`,
  trophy: svg`<path d="M8 3h8v4a4 4 0 0 1-8 0V3Z"></path
    ><path d="M8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 11v5m-4 5h8m-6-5h4v5h-4z"></path>`,
};

export function icon(name: AppIconName, label?: string): TemplateResult {
  return html`<svg
    class="app-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden=${label ? nothing : "true"}
    aria-label=${label ?? nothing}
  >
    ${paths[name]}
  </svg>`;
}
