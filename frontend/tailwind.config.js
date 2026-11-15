/** Tailwind config copied verbatim from the Stitch export (Design/*_1/code.html,
 *  <script id="tailwind-config">). Additions are marked CHANGED.
 *  Tailwind runs only at build time; the browser receives plain CSS. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./login.html", "./src/**/*.ts"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "inverse-on-surface": "#eaf1ff", "on-surface-variant": "#434655", "tertiary-fixed-dim": "#ffb59c",
        "on-secondary-container": "#5c647a", "on-error-container": "#93000a", "on-primary": "#ffffff",
        "on-surface": "#0b1c30", "surface": "#f8f9ff", "primary-fixed": "#dce1ff", "primary": "#0037b0",
        "surface-dim": "#cbdbf5", "primary-container": "#1d4ed8", "error": "#ba1a1a",
        "on-tertiary-fixed": "#390c00", "surface-container-lowest": "#ffffff", "secondary-fixed": "#dae2fd",
        "outline": "#747686", "outline-variant": "#c4c5d7", "surface-container-high": "#dce9ff",
        "surface-container-highest": "#d3e4fe", "inverse-primary": "#b7c4ff", "tertiary-fixed": "#ffdbcf",
        "on-tertiary-container": "#ffc9b7", "surface-variant": "#d3e4fe", "on-primary-fixed": "#001551",
        "inverse-surface": "#213145", "tertiary-container": "#a73400", "primary-fixed-dim": "#b7c4ff",
        "background": "#f8f9ff", "surface-tint": "#2151da", "secondary-fixed-dim": "#bec6e0",
        "on-background": "#0b1c30", "secondary": "#565e74", "on-primary-fixed-variant": "#0039b5",
        "on-error": "#ffffff", "surface-container": "#e5eeff", "on-primary-container": "#cad3ff",
        "error-container": "#ffdad6", "on-secondary-fixed-variant": "#3f465c", "surface-bright": "#f8f9ff",
        "on-tertiary-fixed-variant": "#832700", "secondary-container": "#dae2fd",
        "surface-container-low": "#eff4ff", "on-tertiary": "#ffffff", "on-secondary": "#ffffff",
        "tertiary": "#7f2500", "on-secondary-fixed": "#131b2e",
      },
      borderRadius: { DEFAULT: "0.125rem", lg: "0.25rem", xl: "0.5rem", full: "0.75rem" },
      spacing: {
        gutter: "1rem", "space-xs": "0.25rem", "space-md": "0.75rem", margin: "1.5rem",
        "gutter-compact": "0.75rem", "space-sm": "0.5rem", "margin-compact": "1rem",
        "space-lg": "1rem", "space-xl": "1.5rem",
      },
      // CHANGED: Stitch listed only "Inter" with no fallback and never loaded the font.
      fontFamily: Object.fromEntries(
        ["body-compact", "body-default", "label-default", "label-compact", "headline-lg",
         "tabular-data", "headline-sm", "headline-md"].map((k) => [
          k, ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        ]),
      ),
      fontSize: {
        "body-compact": ["0.8125rem", { lineHeight: "1.125rem", fontWeight: "400" }],
        "body-default": ["0.875rem", { lineHeight: "1.25rem", fontWeight: "400" }],
        "label-default": ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.025em", fontWeight: "600" }],
        "label-compact": ["0.6875rem", { lineHeight: "0.875rem", letterSpacing: "0.04em", fontWeight: "600" }],
        "headline-lg": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.015em", fontWeight: "600" }],
        "tabular-data": ["0.8125rem", { lineHeight: "1.125rem", fontWeight: "500" }],
        "headline-sm": ["1rem", { lineHeight: "1.5rem", letterSpacing: "-0.005em", fontWeight: "600" }],
        "headline-md": ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.01em", fontWeight: "600" }],
      },
    },
  },
  plugins: [],
};
