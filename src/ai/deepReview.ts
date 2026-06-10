import type { ScoreReport } from "../core/types.js";

export interface DeepReviewResult {
  ok: boolean;
  /** Which provider produced the review (or was attempted). */
  provider: "anthropic" | "ollama" | "none";
  /** Markdown review text when ok; otherwise a human-readable reason. */
  text: string;
}

/**
 * Build a compact, structured project summary to send to an LLM. We send
 * metrics and findings — never source code — to keep the payload small and
 * avoid leaking proprietary code.
 */
export function buildSummary(report: ScoreReport): string {
  const d = report.detection;
  const cats = report.categories
    .map((c) =>
      c.applicable
        ? `- ${c.title}: ${c.score}/100 (weight ${c.weight.toFixed(0)}, ${c.tier})` +
          (c.findings.length ? ` — issues: ${c.findings.map((f) => f.message).join("; ")}` : "")
        : `- ${c.title}: n/a (re-weighted out)`,
    )
    .join("\n");
  const deep = report.deep
    ? `Dependency graph: ${report.deep.moduleCount} modules, ${report.deep.cycles.length} cycles, max depth ${report.deep.maxDepth}.`
    : "Deep tier not available for this language.";

  return [
    `Project type: ${d.projectType}`,
    `Primary language: ${d.primaryLanguage}`,
    `Frameworks: ${d.frameworks.join(", ") || "none detected"}`,
    `Overall score: ${report.overall}/100 (grade ${report.grade}), tier: ${report.tierUsed}`,
    `Current folder structure: ${report.folder.current}; recommended: ${report.folder.recommended}`,
    ``,
    `Category breakdown:`,
    cats,
    ``,
    deep,
  ].join("\n");
}

const SYSTEM_PROMPT =
  "You are a senior software architect performing a qualitative review. " +
  "You are given a heuristic system-design analysis of a codebase (scores, findings, folder structure) — not the source itself. " +
  "Provide a concise, prioritized architecture review in Markdown: (1) the 3 highest-leverage improvements, " +
  "(2) any structural risks the heuristics may have under- or over-stated, and (3) a short, concrete next-steps checklist. " +
  "Be specific and pragmatic. Do not restate the raw scores.";

const USER_PREFIX = "Here is the system-design analysis:\n\n";

/**
 * Run an optional qualitative AI review. Provider selection (all use the
 * USER's own resources — nothing is bundled, the maintainer pays nothing):
 *
 *   1. ANTHROPIC_API_KEY set        -> Anthropic Messages API (user's key)
 *   2. ARCHSCORE_AI_PROVIDER=ollama -> local Ollama (free, offline)
 *   3. otherwise, if Ollama appears reachable, use it; else skip gracefully.
 *
 * Never throws; always returns a friendly result object.
 */
export async function deepReview(report: ScoreReport): Promise<DeepReviewResult> {
  const summary = buildSummary(report);
  const provider = (process.env.ARCHSCORE_AI_PROVIDER ?? "").toLowerCase();
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

  if (provider === "ollama") return reviewWithOllama(summary);
  if (provider === "anthropic" || (hasAnthropic && provider !== "ollama")) {
    return reviewWithAnthropic(summary);
  }
  // No explicit choice and no Anthropic key: try free local Ollama if present.
  const ollama = await reviewWithOllama(summary);
  if (ollama.ok) return ollama;

  return {
    ok: false,
    provider: "none",
    text:
      "AI deep-review skipped (the rest of arch-score is fully offline and free).\n" +
      "Enable it with EITHER:\n" +
      "  • a free local model:  install Ollama (https://ollama.com), `ollama pull llama3.1`, then re-run with --deep-ai\n" +
      "  • your own API key:    export ANTHROPIC_API_KEY=... then re-run with --deep-ai\n" +
      "Your key/model is used directly and is never bundled with the package.",
  };
}

async function reviewWithAnthropic(summary: string): Promise<DeepReviewResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, provider: "anthropic", text: "No ANTHROPIC_API_KEY set." };
  }
  const model = process.env.ARCHSCORE_AI_MODEL ?? "claude-sonnet-4-6";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: USER_PREFIX + summary }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        ok: false,
        provider: "anthropic",
        text: `AI deep-review failed: ${res.status} ${res.statusText}. ${detail.slice(0, 300)}`,
      };
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text =
      data.content?.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n") ?? "";
    return { ok: true, provider: "anthropic", text: text.trim() || "(empty response)" };
  } catch (err) {
    return { ok: false, provider: "anthropic", text: `AI deep-review error: ${(err as Error).message}` };
  }
}

async function reviewWithOllama(summary: string): Promise<DeepReviewResult> {
  const host = process.env.OLLAMA_HOST ?? "http://localhost:11434";
  const model = process.env.ARCHSCORE_AI_MODEL ?? "llama3.1";
  try {
    const res = await fetch(`${host.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: USER_PREFIX + summary },
        ],
      }),
    });
    if (!res.ok) {
      return {
        ok: false,
        provider: "ollama",
        text: `Local Ollama review failed: ${res.status} ${res.statusText}. Is the model "${model}" pulled?`,
      };
    }
    const data = (await res.json()) as { message?: { content?: string } };
    const text = (data.message?.content ?? "").trim();
    return text
      ? { ok: true, provider: "ollama", text }
      : { ok: false, provider: "ollama", text: "Local Ollama returned an empty response." };
  } catch {
    return {
      ok: false,
      provider: "ollama",
      text: "Local Ollama not reachable at " + host + ".",
    };
  }
}
