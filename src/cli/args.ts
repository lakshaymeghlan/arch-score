import type { SkillFormat } from "../generators/skill.js";

export interface CliOptions {
  path: string;
  json: boolean;
  html: string | null; // output path or null
  ci: boolean;
  threshold: number;
  emitMd: string | null; // output path
  emitSkill: boolean;
  skillFormat: SkillFormat;
  skillOut: string | null;
  deepAi: boolean;
  noDeep: boolean;
  help: boolean;
  version: boolean;
}

const SKILL_FORMATS: SkillFormat[] = ["agents", "claude", "cursor", "copilot"];

/** Parse argv (without node/script) into CliOptions. Throws on bad input. */
export function parseArgs(argv: string[]): CliOptions {
  const o: CliOptions = {
    path: ".",
    json: false,
    html: null,
    ci: false,
    threshold: 70,
    emitMd: null,
    emitSkill: false,
    skillFormat: "agents",
    skillOut: null,
    deepAi: false,
    noDeep: false,
    help: false,
    version: false,
  };

  let positionalSet = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const takeValue = (): string => {
      const eq = arg.indexOf("=");
      if (eq !== -1) return arg.slice(eq + 1);
      const next = argv[i + 1];
      if (next === undefined) throw new Error(`Missing value for ${arg}`);
      i++;
      return next;
    };
    const flag = arg.includes("=") ? arg.slice(0, arg.indexOf("=")) : arg;

    switch (flag) {
      case "-h":
      case "--help":
        o.help = true;
        break;
      case "-v":
      case "--version":
        o.version = true;
        break;
      case "--json":
        o.json = true;
        break;
      case "--html":
        o.html = arg.includes("=") ? takeValue() : "archscore-report.html";
        break;
      case "--ci":
        o.ci = true;
        break;
      case "--threshold":
        o.threshold = Number(takeValue());
        if (Number.isNaN(o.threshold)) throw new Error("--threshold must be a number");
        break;
      case "--emit-md":
        o.emitMd = arg.includes("=") ? takeValue() : "SYSTEM_DESIGN.md";
        break;
      case "--emit-skill":
        o.emitSkill = true;
        break;
      case "--format": {
        const fmt = takeValue() as SkillFormat;
        if (!SKILL_FORMATS.includes(fmt)) {
          throw new Error(`--format must be one of: ${SKILL_FORMATS.join(", ")}`);
        }
        o.skillFormat = fmt;
        break;
      }
      case "--skill-out":
        o.skillOut = takeValue();
        break;
      case "--deep-ai":
        o.deepAi = true;
        break;
      case "--no-deep":
        o.noDeep = true;
        break;
      default:
        if (arg.startsWith("-")) {
          throw new Error(`Unknown flag: ${arg}`);
        }
        if (!positionalSet) {
          o.path = arg;
          positionalSet = true;
        } else {
          throw new Error(`Unexpected argument: ${arg}`);
        }
    }
  }
  return o;
}

export const HELP = `
arch-score — score how well a project follows modern system-design standards.

Usage:
  archscore [path] [options]

Arguments:
  path                  Project directory to analyze (default: ".")

Output:
  --json                Print the full report as JSON
  --html[=file]         Write an HTML report (default: archscore-report.html)
  --ci                  Exit non-zero if the score is below --threshold
  --threshold <n>       CI threshold, 0-100 (default: 70)

Generators:
  --emit-md[=file]      Write SYSTEM_DESIGN.md playbook (default: SYSTEM_DESIGN.md)
  --emit-skill          Write an AI-assistant guidance file
  --format <fmt>        Skill format: agents | claude | cursor | copilot (default: agents)
  --skill-out <file>    Override the skill output path

Analysis:
  --no-deep             Skip Deep-tier (import-graph) analysis
  --deep-ai             Send a structured summary to an LLM for qualitative
                        review (uses your own ANTHROPIC_API_KEY; never bundled)

Other:
  -h, --help            Show this help
  -v, --version         Show version

Examples:
  archscore .
  archscore ./service --ci --threshold 80
  archscore . --emit-md --emit-skill --format claude
  archscore . --json > report.json
`;
