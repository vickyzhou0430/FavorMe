import type { CSSProperties } from "react";

/**
 * Mirrors :root and body in globals.css so the UI still reads correctly if
 * the compiled stylesheet fails to load (stale .next, wrong port, blocked /_next, etc.).
 * Keep in sync when changing theme tokens or body background.
 */
export const rootCssVarsStyle = {
  "--bg0": "6 20 80",
  "--bg1": "36 43 109",
  "--text": "240 242 255",
  "--muted": "172 182 214",
  "--border": "255 255 255",
  "--glass": "255 255 255",
  "--accent": "150 132 255",
  "--accent2": "120 203 255",
  "--pill": "132 118 255",
  "--safe-top": "env(safe-area-inset-top, 0px)",
  "--safe-bottom": "env(safe-area-inset-bottom, 0px)",
  "--safe-left": "env(safe-area-inset-left, 0px)",
  "--safe-right": "env(safe-area-inset-right, 0px)",
} as CSSProperties;

/** Same gradient stack as `body` / `.bg-app` in globals.css */
export const appBackgroundGradient =
  "radial-gradient(760px 440px at 50% -10%, rgba(124, 139, 255, 0.18), transparent 62%), radial-gradient(680px 360px at 8% 24%, rgba(255, 255, 255, 0.05), transparent 62%), radial-gradient(520px 360px at 92% 38%, rgba(143, 168, 255, 0.12), transparent 66%), linear-gradient(180deg, rgb(36, 43, 109) 0%, rgb(6, 20, 80) 76%)";

export const bodyFallbackStyle = {
  margin: 0,
  color: "rgb(240, 242, 255)",
  WebkitTapHighlightColor: "transparent",
  background: appBackgroundGradient,
  minHeight: "100%",
} as CSSProperties;
