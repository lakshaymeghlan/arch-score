import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import type { ArchScoreConfig } from "../core/types.js";

const CONFIG_NAMES = [
  "archscore.config.js",
  "archscore.config.mjs",
  "archscore.config.json",
];

/**
 * Load an optional archscore config from the project root. Supports a JS/MJS
 * module (default export) or a JSON file. Returns an empty config if none
 * exists or it fails to load (the tool must never hard-fail on config).
 */
export async function loadConfig(root: string): Promise<ArchScoreConfig> {
  for (const name of CONFIG_NAMES) {
    const abs = path.join(root, name);
    if (!fs.existsSync(abs)) continue;
    try {
      if (name.endsWith(".json")) {
        return JSON.parse(fs.readFileSync(abs, "utf8")) as ArchScoreConfig;
      }
      const mod = (await import(pathToFileURL(abs).href)) as {
        default?: ArchScoreConfig;
      };
      return mod.default ?? {};
    } catch (err) {
      process.stderr.write(
        `arch-score: failed to load ${name}: ${(err as Error).message}\n`,
      );
      return {};
    }
  }
  return {};
}
