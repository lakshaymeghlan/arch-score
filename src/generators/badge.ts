import type { ScoreReport } from "../core/types.js";

/** shields.io color name for a score band. */
export function badgeColorName(score: number): string {
  if (score >= 90) return "brightgreen";
  if (score >= 80) return "green";
  if (score >= 70) return "yellowgreen";
  if (score >= 60) return "yellow";
  if (score >= 50) return "orange";
  return "red";
}

const COLOR_HEX: Record<string, string> = {
  brightgreen: "#4c1",
  green: "#97ca00",
  yellowgreen: "#a4a61d",
  yellow: "#dfb317",
  orange: "#fe7d37",
  red: "#e05d44",
};

const LABEL = "arch-score";

function badgeMessage(report: ScoreReport): string {
  return `${report.overall} (${report.grade})`;
}

/**
 * shields.io endpoint schema. Consumers can render it via
 * `https://img.shields.io/endpoint?url=<raw-json-url>`.
 */
export function generateBadgeJson(report: ScoreReport): string {
  return JSON.stringify({
    schemaVersion: 1,
    label: LABEL,
    message: badgeMessage(report),
    color: badgeColorName(report.overall),
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * A self-contained "flat" badge SVG — rendered by us so the badge needs no
 * third-party service (keeps the offline/zero-dep guarantee end to end).
 */
export function generateBadgeSvg(report: ScoreReport): string {
  const label = LABEL;
  const message = badgeMessage(report);
  const color = COLOR_HEX[badgeColorName(report.overall)];

  // Approximate text widths (Verdana ~7px/char at size 11); textLength keeps
  // the rendered text fitted to the computed box regardless of font metrics.
  const charW = 7;
  const pad = 10;
  const lw = Math.round(label.length * charW) + pad;
  const mw = Math.round(message.length * charW) + pad;
  const w = lw + mw;

  // Positions in the scaled (×10) text coordinate space.
  const labelX = Math.round((lw / 2) * 10);
  const msgX = Math.round((lw + mw / 2) * 10);
  const labelLen = (lw - pad) * 10;
  const msgLen = (mw - pad) * 10;

  const aria = `${label}: ${message}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="20" role="img" aria-label="${escapeXml(aria)}">
  <title>${escapeXml(aria)}</title>
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="r"><rect width="${w}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${lw}" height="20" fill="#555"/>
    <rect x="${lw}" width="${mw}" height="20" fill="${color}"/>
    <rect width="${w}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="${labelX}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${labelLen}">${escapeXml(label)}</text>
    <text x="${labelX}" y="140" transform="scale(.1)" textLength="${labelLen}">${escapeXml(label)}</text>
    <text aria-hidden="true" x="${msgX}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${msgLen}">${escapeXml(message)}</text>
    <text x="${msgX}" y="140" transform="scale(.1)" textLength="${msgLen}">${escapeXml(message)}</text>
  </g>
</svg>
`;
}
