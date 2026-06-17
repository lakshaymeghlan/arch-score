import * as fs from "node:fs";
import * as path from "node:path";
import { analyzeProject } from "../core/analyze.js";
import { loadConfig } from "../config/load.js";
import { renderTerminal, renderJson, renderHtml } from "../reporters/index.js";
import {
  generateSystemDesign,
  generateSkill,
  SKILL_FILENAMES,
  generateBadgeSvg,
  generateBadgeJson,
  generatePrComment,
} from "../generators/index.js";
import { deepReview } from "../ai/deepReview.js";
import { VERSION } from "../core/constants.js";
import { parseArgs, HELP, type CliOptions } from "./args.js";

function writeFileEnsuringDir(file: string, content: string): void {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

/** Run the CLI. Returns the process exit code. */
export async function run(argv: string[]): Promise<number> {
  let opts: CliOptions;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`arch-score: ${(err as Error).message}\n`);
    process.stderr.write(HELP);
    return 2;
  }

  if (opts.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (opts.version) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  const root = path.resolve(opts.path);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    process.stderr.write(`arch-score: not a directory: ${root}\n`);
    return 2;
  }

  const config = await loadConfig(root);
  if (opts.ci && config.threshold !== undefined && argvHasNoThreshold(argv)) {
    opts.threshold = config.threshold;
  }

  const report = analyzeProject(root, { config, noDeep: opts.noDeep });

  // Primary output: JSON or pretty terminal.
  if (opts.json) {
    process.stdout.write(renderJson(report) + "\n");
  } else {
    process.stdout.write(renderTerminal(report) + "\n");
  }

  // Side-effect outputs.
  if (opts.html) {
    writeFileEnsuringDir(opts.html, renderHtml(report));
    if (!opts.json) process.stdout.write(`  → HTML report written to ${opts.html}\n`);
  }
  if (opts.emitMd) {
    writeFileEnsuringDir(opts.emitMd, generateSystemDesign(report));
    if (!opts.json) process.stdout.write(`  → ${opts.emitMd} written\n`);
  }
  if (opts.emitSkill) {
    const out = opts.skillOut ?? SKILL_FILENAMES[opts.skillFormat];
    writeFileEnsuringDir(out, generateSkill(report, opts.skillFormat));
    if (!opts.json) process.stdout.write(`  → ${out} written (${opts.skillFormat} format)\n`);
  }
  if (opts.emitBadge) {
    writeFileEnsuringDir(opts.emitBadge, generateBadgeSvg(report));
    if (!opts.json) process.stdout.write(`  → ${opts.emitBadge} written (SVG badge)\n`);
  }
  if (opts.emitBadgeJson) {
    writeFileEnsuringDir(opts.emitBadgeJson, generateBadgeJson(report));
    if (!opts.json) process.stdout.write(`  → ${opts.emitBadgeJson} written (shields endpoint)\n`);
  }
  if (opts.emitComment) {
    writeFileEnsuringDir(opts.emitComment, generatePrComment(report));
    if (!opts.json) process.stdout.write(`  → ${opts.emitComment} written (PR comment)\n`);
  }

  // Optional AI deep-review.
  if (opts.deepAi) {
    const result = await deepReview(report);
    if (opts.json) {
      process.stdout.write(JSON.stringify({ deepAi: result }, null, 2) + "\n");
    } else {
      process.stdout.write("\n  AI deep-review\n  " + "─".repeat(54) + "\n");
      process.stdout.write(
        result.text
          .split("\n")
          .map((l) => "  " + l)
          .join("\n") + "\n",
      );
    }
  }

  // CI gate.
  if (opts.ci && report.overall < opts.threshold) {
    if (!opts.json) {
      process.stderr.write(
        `\narch-score: overall ${report.overall} is below threshold ${opts.threshold}.\n`,
      );
    }
    return 1;
  }
  return 0;
}

/** True if the user did not explicitly pass --threshold (so config can win). */
function argvHasNoThreshold(argv: string[]): boolean {
  return !argv.some((a) => a === "--threshold" || a.startsWith("--threshold="));
}
