# arch-score

> A language-agnostic CLI that scores how well **any** project follows modern system-design standards, recommends the best folder structure, and emits guidance files that make AI coding assistants follow good system design.

[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

`arch-score` is a **heuristic advisor**, not a judge. It gives you a score (0–100), explains *why* points were lost with file-level references, and hands you prioritized, concrete fixes. It works on frontend or backend code in **any language**, runs **fully offline**, and has **zero paid dependencies**.

```
  arch-score  v0.1.0
  ──────────────────────────────────────────────────────
  Project   backend  (confidence 85%)
  Language  TypeScript  ·  express
  Tier      deep (JavaScript/TypeScript, 41 modules)

  OVERALL    72/100  C   ████████████████████░░░░░░░░
  ──────────────────────────────────────────────────────

  Categories
    Architecture & Layering      100 ██████████████ w19
    Modularity & Coupling         80 ███████████░░░ w11 ◆
    Folder Structure              88 ████████████░░ w15
    Testing Architecture          45 ██████░░░░░░░░ w11
    Containerization              70 ██████████░░░░ w6
    ...
```

> Weights are normalized across the categories that apply to your project — a
> backend includes Containerization (shown above); a CLI or library re-weights
> it out, and the remaining categories total 100 on their own.

---

## Install

```bash
# Run without installing
npx arch-score .

# Or install globally
npm install -g arch-score
archscore .
```

Requires Node.js ≥ 18.

---

## Quick start

```bash
archscore .                       # pretty terminal report
archscore ./service --ci          # exit non-zero if below threshold (CI gate)
archscore . --json > report.json  # machine-readable
archscore . --html                # writes archscore-report.html
archscore . --emit-md             # writes SYSTEM_DESIGN.md playbook
archscore . --emit-skill --format claude   # writes CLAUDE.md for AI assistants
```

---

## How it works: tiered analysis

`arch-score` auto-detects languages, frameworks, and project type from manifests
(`package.json`, `pyproject.toml`, `go.mod`, `pom.xml`, `Cargo.toml`, `composer.json`, `Gemfile`, …) and file extensions, then runs two tiers:

- **Universal tier** — works for **every** language. Folder/architecture pattern detection, config-as-env vs hardcoded, test presence & ratio, a CI-runs-tests check, docs, containerization (Dockerfile/compose) for services, observability config, lockfile & dependency-pinning checks, secret-leakage heuristics, and file/module size outliers.
- **Deep tier** — optional per-language plugins that build a real import/dependency graph for **circular-dependency**, **fan-in/fan-out**, and **graph-depth** analysis. Ships with adapters for **JavaScript/TypeScript, Python, and Go**. For unsupported languages it **degrades gracefully** to universal-tier scoring and tells you which tier ran.

The report header always states the tier used, and any category that can't be
fairly assessed is **re-weighted out** (its weight is redistributed) rather than
scored zero — so an unsupported language is never silently penalized.

---

## The rubric

Each category is scored 0–100 against a transparent rubric (start at 100, lose
points per finding), then combined into a weighted overall score. The default
profile is **structure-first**. Weights are **relative**: arch-score normalizes
them across the categories that apply to your project, so the effective weights
always total 100 for a given project.

| Category | Weight | Tier | What it rewards |
| --- | ---: | --- | --- |
| **Architecture & Layering** | 20 | Universal | A recognizable pattern, thin entry points, no god-folders |
| **Folder Structure** | 16 | Universal | Layout matches a convention for the detected project type; sane depth |
| **Modularity & Coupling** | 12 | Deep\* | No circular deps, no fan-out/fan-in outliers, shallow graph |
| **Testing Architecture** | 12 | Universal | Test presence, healthy test-to-source ratio, integration layer, CI-runs-tests |
| **Config & 12-Factor** | 10 | Universal | Env-based config, `.env.example`, no committed `.env`, no hardcoded endpoints |
| **Error Handling & Resilience** | 8 | Universal | No swallowed errors, a central handler, timeouts/retries for services |
| **Security Hygiene** | 8 | Universal | No leaked secrets, `.gitignore` covers env, lockfile committed |
| **Observability** | 7 | Universal | Structured logging, metrics/tracing deps, health endpoints |
| **Documentation** | 7 | Universal | A substantial README, architecture docs, contributing guide |
| **Containerization** | 6 | Universal\*\* | A Dockerfile/compose file, with a HEALTHCHECK |

\* Modularity uses the Deep tier when an adapter supports the language; otherwise
it falls back to a coarse module-size cohesion proxy and says so.

\*\* Containerization applies to **services only** (`backend`, `monorepo`). For
CLIs, libraries, frontends, and mobile apps it's re-weighted out — they're never
penalized for not having a Dockerfile.

### Rubric details

<details>
<summary><b>Architecture &amp; Layering (20)</b></summary>

- −30 — no recognizable pattern (layered / hexagonal / feature / MVC) or code is flat
- −15 — entry points and business logic live at the same shallow level
- −15 — a single "god-folder" holds >60% of source files
</details>

<details>
<summary><b>Modularity &amp; Coupling (12)</b></summary>

Deep tier:
- −up to 35 — circular dependency cycles
- −up to 20 — modules with very high fan-out
- −up to 15 — god-modules with very high fan-in
- −10 — dependency chains deeper than 8

Universal fallback:
- −up to 25 — oversized modules (>400 lines) as a low-cohesion proxy
</details>

<details>
<summary><b>Folder Structure (16)</b></summary>

- −30 — essentially flat (no meaningful directories)
- −18 — layout doesn't match any recognized convention
- −8 — layout doesn't match the best convention for the project type
- −up to 12 — missing recommended directories for the project type
- −8 — excessive nesting (>8 levels)
</details>

<details>
<summary><b>Testing Architecture (12)</b></summary>

- −55 — no tests at all
- −30 / −15 — very low / modest test-to-source ratio (banded)
- −10 — no integration/e2e layer in a non-trivial codebase
- −8 — no CI configuration running tests
</details>

<details>
<summary><b>Config &amp; 12-Factor (10)</b></summary>

- −25 — a concrete `.env` file committed
- −up to 20 — hardcoded hosts/IPs/URLs in source
- −8 — reads env vars but has no `.env.example`
- −8 — no evidence of environment-based config
</details>

<details>
<summary><b>Error Handling &amp; Resilience (8)</b></summary>

- −up to 30 — empty/swallowed catch blocks
- −12 — no timeout/retry/circuit-breaker signals (services)
- −10 — no centralized error-handling boundary
</details>

<details>
<summary><b>Observability (7)</b></summary>

- −18 — no structured logging (bare prints) in a service
- −12 — no metrics/tracing instrumentation
- −10 — no health/readiness endpoint
</details>

<details>
<summary><b>Security Hygiene (8)</b></summary>

- −up to 45 — likely hardcoded secrets/credentials
- −12 — `.env` files exist but aren't git-ignored
- −8 — manifest present but no lockfile committed
- −6 — no `.gitignore`
</details>

<details>
<summary><b>Documentation (7)</b></summary>

- −40 — no README
- −18 — thin README (few words / headings)
- −10 — no architecture/design docs
- −5 — no CONTRIBUTING guide (larger projects)
</details>

<details>
<summary><b>Containerization (6) — services only</b></summary>

Applies to `backend` and `monorepo` projects; re-weighted out (never penalized)
for CLIs, libraries, frontends, and mobile apps.

- −30 — no Dockerfile or docker-compose file for a service
- −12 — a Dockerfile is present but defines no `HEALTHCHECK`
</details>

Grades: **A** ≥ 90, **B** ≥ 80, **C** ≥ 70, **D** ≥ 60, **E** ≥ 50, else **F**.

---

## Folder-structure advisor

`arch-score` classifies your **current** structure (`layered`, `hexagonal/clean`,
`feature/domain`, `mvc`, or `flat`) and recommends the **best** structure for the
detected project type, with a concrete proposed tree and rationale:

| Project type | Recommended | Shape |
| --- | --- | --- |
| **Backend** API/service | Hexagonal / Clean | `domain/ application/ infrastructure/ interfaces/http/ config/` |
| **Frontend** SPA | Feature-based | `app/ features/<feature>/{components,hooks,api,state}/ shared/` |
| **CLI** | Layered | thin `bin/` → `commands/` → pure `core/` → `adapters/` |
| **Library** | Public surface | `src/index` + hidden `internal/` |
| **Mobile** | Feature-modular | `features/ navigation/ design-system/` |
| **Monorepo** | Workspaces | `apps/` + `packages/`, each following its own type |

Run with `--emit-md` to get the full proposed tree and gap diff.

---

## Guidance file generation

This is the differentiator: encode your project's conventions + the recommended
architecture as **actionable rules for AI coding assistants**.

```bash
archscore . --emit-md                      # SYSTEM_DESIGN.md — human playbook
archscore . --emit-skill --format agents   # AGENTS.md
archscore . --emit-skill --format claude   # CLAUDE.md
archscore . --emit-skill --format cursor   # .cursorrules
archscore . --emit-skill --format copilot  # .github/copilot-instructions.md
```

See [`examples/`](./examples) for real generated output.

---

## Output modes & CI

```bash
archscore . --ci --threshold 80   # exit code 1 if overall < 80
archscore . --json                # full JSON report (graph summarized)
archscore . --html=report.html    # self-contained HTML report
```

`--ci` makes it a quality gate you can drop into any pipeline.

---

## Optional AI deep-review (`--deep-ai`)

The core tool is 100% offline and uses **no AI**. The optional `--deep-ai` flag
adds a qualitative architecture review on top — and it stays **free**:

- **Local & free:** install [Ollama](https://ollama.com), `ollama pull llama3.1`, then `archscore . --deep-ai`. Runs fully offline at zero cost.
- **Your own API key:** `export ANTHROPIC_API_KEY=...` and `arch-score` will use Anthropic instead. Your key is used directly and **never bundled** with the package.

If neither is available, `--deep-ai` prints a friendly note and the rest of the
report is unaffected. Only metrics and findings are sent — **never your source code**.

```bash
ARCHSCORE_AI_PROVIDER=ollama  ARCHSCORE_AI_MODEL=llama3.1  archscore . --deep-ai
ANTHROPIC_API_KEY=sk-...       ARCHSCORE_AI_MODEL=claude-sonnet-4-6  archscore . --deep-ai
```

---

## Configuration

Drop an `archscore.config.js` (or `.mjs` / `.json`) in your project root. See
[`archscore.config.example.js`](./archscore.config.example.js):

```js
export default {
  weights: { architecture: 25, testing: 15 }, // re-normalized automatically
  ignore: ["generated", "third_party"],
  threshold: 75,
  // projectType: "backend",  // force instead of auto-detecting
};
```

---

## Programmatic API

```ts
import { analyzeProject, renderTerminal, generateSkill } from "arch-score";

const report = analyzeProject("./my-project");
console.log(report.overall, report.grade);
console.log(renderTerminal(report));
const claudeMd = generateSkill(report, "claude");
```

---

## Architecture (it eats its own dog food)

```
src/
  core/         orchestrator, types, scoring engine, scanner, constants
  detect/       language / framework / project-type detection
  analyzers/    universal-tier checks — one module per category (Analyzer interface)
  adapters/     deep-tier language plugins: js-ts, python, go (LangAdapter interface)
  advisor/      folder-structure classification + recommendation
  reporters/    terminal | json | html
  generators/   SYSTEM_DESIGN.md + AI skill files
  ai/           optional --deep-ai (user's own key or local Ollama)
  cli/          argument parsing + run loop
  bin/          archscore executable
```

Analyzers and adapters are pluggable behind common interfaces, so **new language
analyzers and new checks drop in without touching the core**.

### Adding a language adapter

Implement `LangAdapter` (build an adjacency map of module → imports, hand it to
`analyzeGraph`), then register it in `src/adapters/index.ts`. That's it — the
Deep tier picks it up for matching projects automatically.

---

## Development

```bash
npm install
npm run build
npm test          # 48 unit + e2e tests
npm run selfscan  # run arch-score on itself
```

---

## License

[MIT](./LICENSE)
