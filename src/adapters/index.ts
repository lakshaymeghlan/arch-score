import type { Detection, LangAdapter } from "../core/types.js";
import { jsTsAdapter } from "./js-ts.js";
import { pythonAdapter } from "./python.js";
import { goAdapter } from "./go.js";

/** Registry of Deep-tier language adapters. New languages plug in here. */
export const ADAPTERS: LangAdapter[] = [jsTsAdapter, pythonAdapter, goAdapter];

/**
 * Pick the adapter for the project's primary language. Returns null when no
 * Deep adapter supports it (analysis then degrades to universal tier).
 */
export function selectAdapter(detection: Detection): LangAdapter | null {
  const primary = detection.primaryLanguage;
  // Prefer an adapter that matches the primary language explicitly.
  const byPrimary = ADAPTERS.find((a) =>
    a.language.toLowerCase().includes(primary.toLowerCase()) ||
    primary.toLowerCase().includes(a.language.split("/")[0].toLowerCase()),
  );
  if (byPrimary) return byPrimary;
  return ADAPTERS.find((a) => a.matches(detection)) ?? null;
}

export { jsTsAdapter, pythonAdapter, goAdapter };
