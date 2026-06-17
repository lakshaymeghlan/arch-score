import type { ScoreReport } from "../core/types.js";

/** Marker used to find and update a sticky PR comment across runs. */
export const PR_COMMENT_MARKER = "<!-- arch-score-bot -->";

const REPO_URL = "https://github.com/lakshaymeghlan/arch-score";

function band(score: number): string {
  if (score >= 80) return "🟢";
  if (score >= 60) return "🟡";
  return "🔴";
}

/**
 * A concise markdown summary for a PR comment. Includes the hidden marker (for
 * sticky updates) and a "Powered by arch-score" backlink — the adoption hook.
 */
export function generatePrComment(report: ScoreReport): string {
  const rows = report.categories
    .filter((c) => c.applicable)
    .map((c) => `| ${band(c.score)} | ${c.title} | ${c.score} | ${c.weight.toFixed(0)} |`)
    .join("\n");

  const recs =
    report.recommendations.length > 0
      ? report.recommendations
          .slice(0, 5)
          .map((r, i) => `${i + 1}. ${r.message}\n   - ${r.fix}`)
          .join("\n")
      : "No issues found 🎉";

  return [
    PR_COMMENT_MARKER,
    `## ${band(report.overall)} arch-score: ${report.overall}/100 · grade ${report.grade}`,
    ``,
    `**Project:** \`${report.detection.projectType}\` · **Language:** ${report.detection.primaryLanguage} · **Tier:** ${report.tierUsed}`,
    ``,
    `| | Category | Score | Weight |`,
    `|:--:|:--|--:|--:|`,
    rows,
    ``,
    `### Top fixes`,
    recs,
    ``,
    `**Folder structure:** \`${report.folder.current}\` → recommended \`${report.folder.recommended}\` (${report.folder.projectType})`,
    ``,
    `---`,
    `<sub>📐 Measured by [arch-score](${REPO_URL}) — run it yourself: \`npx arch-score .\`</sub>`,
    ``,
  ].join("\n");
}
