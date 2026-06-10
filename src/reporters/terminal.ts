import type { ScoreReport } from "../core/types.js";
import { c, scoreColor } from "./colors.js";

function bar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width);
  const color = scoreColor(score);
  return color("█".repeat(filled)) + c.gray("░".repeat(width - filled));
}

/** Render the full pretty terminal report as a string. */
export function renderTerminal(report: ScoreReport): string {
  const out: string[] = [];
  const line = (s = "") => out.push(s);

  line();
  line(c.bold(c.cyan("  arch-score")) + c.gray(`  v${report.version}`));
  line(c.gray("  " + "─".repeat(54)));

  // Detection summary.
  const d = report.detection;
  line(
    `  ${c.bold("Project")}   ${d.projectType}` +
      c.gray(`  (confidence ${Math.round(d.confidence * 100)}%)`),
  );
  line(
    `  ${c.bold("Language")}  ${d.primaryLanguage}` +
      (d.frameworks.length ? c.gray(`  ·  ${d.frameworks.join(", ")}`) : ""),
  );
  line(`  ${c.bold("Tier")}      ${report.tierUsed}${report.deep ? c.gray(` (${report.deep.language}, ${report.deep.moduleCount} modules)`) : ""}`);

  // Overall score.
  line();
  const sc = scoreColor(report.overall);
  line(
    `  ${c.bold("OVERALL")}   ${sc(c.bold(String(report.overall).padStart(3)))}` +
      `${c.gray("/100")}  ${sc(c.bold(report.grade))}   ${bar(report.overall, 28)}`,
  );
  line(c.gray("  " + "─".repeat(54)));

  // Category breakdown.
  line();
  line(c.bold("  Categories"));
  for (const cat of report.categories) {
    if (!cat.applicable) {
      line(
        `    ${c.gray(cat.title.padEnd(28))} ${c.gray("n/a")}  ${c.gray(
          `(re-weighted out · ${cat.tier})`,
        )}`,
      );
      continue;
    }
    const color = scoreColor(cat.score);
    line(
      `    ${cat.title.padEnd(28)} ${color(String(cat.score).padStart(3))} ` +
        `${bar(cat.score, 14)} ${c.gray(`w${cat.weight.toFixed(0)} ${cat.tier === "deep" ? "◆" : " "}`)}`,
    );
  }

  // Top recommendations.
  line();
  line(c.bold("  Top recommendations"));
  if (report.recommendations.length === 0) {
    line(c.green("    ✓ No issues found — nicely done."));
  } else {
    const top = report.recommendations.slice(0, 8);
    top.forEach((r, i) => {
      line(`    ${c.bold(String(i + 1) + ".")} ${r.message}`);
      line(`       ${c.gray("→ " + r.fix)}`);
      if (r.refs && r.refs.length) {
        line(`       ${c.gray(c.dim(r.refs.slice(0, 3).join(", ")))}`);
      }
    });
    if (report.recommendations.length > top.length) {
      line(c.gray(`    … and ${report.recommendations.length - top.length} more.`));
    }
  }

  // Folder advice.
  const f = report.folder;
  line();
  line(c.bold("  Folder structure"));
  line(
    `    Current: ${c.yellow(f.current)}   →   Recommended: ${c.green(f.recommended)} ${c.gray(
      `(${f.projectType})`,
    )}`,
  );
  if (f.gaps.length) {
    for (const g of f.gaps.slice(0, 4)) line(`      ${c.gray("•")} ${g}`);
  }
  line(c.gray("    Run with --emit-md for the full proposed tree and playbook."));

  // Findings detail (severity-tagged) — compact.
  line();
  line(c.gray("  " + "─".repeat(54)));
  line(c.gray(`  Generated ${report.generatedAt}`));
  line();

  return out.join("\n");
}
