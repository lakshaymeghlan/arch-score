# Architecture

arch-score is a small, layered TypeScript CLI with a pluggable analyzer/adapter
core. It eats its own dog food — the layout below maps 1:1 to the categories the
tool itself rewards.

## Data flow

```
scan ──▶ ProjectContext ──▶ detect ──▶ Detection
                              │
                  ┌───────────┴───────────┐
                  ▼                        ▼
        universal analyzers        deep adapter (optional)
        (one per category)         (import graph: js-ts | python | go)
                  │                        │
                  └───────────┬────────────┘
                              ▼
                       scoring engine  ──▶ dynamic re-weighting
                              ▼
                        ScoreReport
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                 ▼
          reporters       generators         ai (--deep-ai)
       terminal/json/   SYSTEM_DESIGN.md /   user key or
          html          skills/badge/PR      local Ollama
```

## Layers (`src/`)

| Dir | Responsibility |
| --- | --- |
| `core/` | Orchestrator (`analyze.ts`), shared `types.ts`, scoring engine + re-weighting, filesystem scanner, constants |
| `detect/` | Language, framework, and project-type detection from manifests + extensions |
| `analyzers/` | Universal-tier checks — one module per category, all behind the `Analyzer` interface |
| `adapters/` | Deep-tier language plugins (js-ts, python, go) behind the `LangAdapter` interface; `graph.ts` holds shared cycle/fan-in/out/depth analysis |
| `advisor/` | Folder-structure classification + per-project-type recommendation |
| `reporters/` | Output renderers: terminal, json, html |
| `generators/` | `SYSTEM_DESIGN.md`, AI skill files, score badge (SVG/JSON), PR comment |
| `ai/` | Optional `--deep-ai` review (user's own key or local Ollama) |
| `cli/` | Argument parsing + run loop |
| `bin/` | The `archscore` executable entry point |

## Key design decisions

- **Tiered analysis.** Universal-tier checks run for every language. Deep-tier
  adapters add real import-graph analysis where available and **degrade
  gracefully** otherwise — the report always states which tier ran.
- **Dynamic re-weighting.** A category that can't be fairly assessed (e.g.
  Containerization on a CLI) is removed and the remaining weights are
  normalized to 100, so a project is never silently penalized.
- **Offline & zero-paid-dependency core.** All scoring, parsing, and file
  generation is local. The only network feature is the opt-in `--deep-ai`.
- **Pluggability.** New analyzers and language adapters drop in behind common
  interfaces without touching the orchestrator.

## Adding a piece

- **A check:** implement `Analyzer`, register it in `src/analyzers/index.ts`.
- **A language:** implement `LangAdapter` (build an adjacency map of module →
  imports, hand it to `analyzeGraph`), register it in `src/adapters/index.ts`.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the dev workflow.
