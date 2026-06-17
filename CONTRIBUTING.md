# Contributing to arch-score

Thanks for your interest! arch-score is a small, well-tested TypeScript codebase
and contributions are welcome.

## Setup

```bash
git clone https://github.com/lakshaymeghlan/arch-score.git
cd arch-score
npm install
npm run build
npm test          # unit + e2e tests
npm run selfscan  # run arch-score on itself
```

Requires Node.js ≥ 18.

## Project layout

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full map. In short: analyzers
(`src/analyzers/`) and language adapters (`src/adapters/`) are pluggable behind
common interfaces, so most contributions don't touch the core.

## Conventions

- **TypeScript, ESM.** Use `.js` extensions in relative imports (NodeNext).
- **Keep the core offline.** No network calls or paid dependencies outside the
  opt-in `--deep-ai` feature.
- **Every change ships with tests.** Add or update tests in `tests/` for any
  behavior you change; `npm test` must stay green.
- Match the surrounding style; keep functions small and pure where possible.

## Adding a check (analyzer)

1. Create `src/analyzers/<name>.ts` implementing the `Analyzer` interface.
2. Start each category at 100 and subtract per finding (use `buildCategory`).
3. Register it in `src/analyzers/index.ts`.
4. Add `tests/<name>.test.ts` (use `fakeContext` from `tests/helpers.ts`).

## Adding a language adapter (deep tier)

1. Create `src/adapters/<lang>.ts` implementing `LangAdapter`.
2. Extract imports → build an adjacency map → pass it to `analyzeGraph`.
3. Register it in `src/adapters/index.ts`.
4. Add tests covering import extraction and cycle detection.

## Pull requests

1. Branch off `main`.
2. `npm test` and `npm run selfscan` should pass; don't let the self-score regress.
3. Describe what changed and why. Keep PRs focused.

## Releases (maintainers)

`npm version <patch|minor|major>` → `npm publish` (runs build + tests via
`prepublishOnly`) → `git push --follow-tags`.

By contributing you agree your work is licensed under the project's [MIT License](./LICENSE).
