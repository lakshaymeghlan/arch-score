import type {
  FolderAdvice,
  ProjectContext,
  ProjectType,
  StructurePattern,
} from "../core/types.js";
import { classifyStructure, dirNameSet } from "./classify.js";

interface Template {
  recommended: StructurePattern;
  rationale: string;
  tree: string;
  /** Directory names the recommended layout expects to see. */
  expects: string[];
}

const TEMPLATES: Record<ProjectType, Template> = {
  backend: {
    recommended: "hexagonal",
    rationale:
      "Hexagonal/clean architecture keeps domain logic independent of frameworks and transport, " +
      "so the core stays testable and you can swap HTTP/DB/queues without touching business rules.",
    tree: `src/
  domain/            # entities, value objects, domain services (no framework imports)
  application/       # use-cases / orchestration, depends only on domain
  infrastructure/    # db, cache, queues, 3rd-party clients (implements ports)
  interfaces/
    http/            # controllers, routes, request/response mapping
  config/            # env loading, composition root / wiring
  shared/            # cross-cutting utilities, errors, types
tests/
  unit/
  integration/`,
    expects: ["domain", "application", "infrastructure", "interfaces", "config"],
  },
  frontend: {
    recommended: "feature",
    rationale:
      "Feature-based structure co-locates everything a feature needs (UI, state, data access) " +
      "so changes stay local and the type-first 'components/ services/ utils/' mega-folders don't sprawl.",
    tree: `src/
  app/               # routing, providers, app shell
  features/
    <feature>/
      components/
      hooks/
      api/           # data access for this feature
      state/
      index.ts       # public surface of the feature
  shared/            # design system, shared hooks, primitives
  lib/               # framework-agnostic helpers
  assets/`,
    expects: ["features", "shared", "app"],
  },
  cli: {
    recommended: "layered",
    rationale:
      "Keep IO at the edges: a thin bin/ entry parses args and delegates to commands/, which call " +
      "pure core/ logic. This keeps the business logic testable without spawning the CLI.",
    tree: `bin/                 # executable entry, arg parsing only
src/
  commands/          # one module per command, thin
  core/              # pure business logic, no process/IO
  adapters/          # fs, network, process boundaries
  config/
tests/`,
    expects: ["commands", "core"],
  },
  library: {
    recommended: "layered",
    rationale:
      "Expose a deliberate public surface from src/index and hide everything else under internal/, " +
      "so consumers depend on a stable API and you can refactor internals freely.",
    tree: `src/
  index.ts           # the public API surface (re-exports)
  <feature>.ts       # public modules
  internal/          # implementation details, not exported
tests/
  unit/`,
    expects: ["internal"],
  },
  mobile: {
    recommended: "feature",
    rationale:
      "Feature-modular layout with a shared design system and a dedicated navigation layer keeps " +
      "screens independent and the navigation graph explicit.",
    tree: `src/
  features/
    <feature>/
      screens/
      components/
      hooks/
      api/
  navigation/        # navigators, route definitions
  design-system/     # shared UI primitives, theme
  services/          # platform + network boundaries
  shared/`,
    expects: ["features", "navigation"],
  },
  monorepo: {
    recommended: "feature",
    rationale:
      "Separate deployable apps/ from reusable packages/ (libs), hoist shared config, and let each " +
      "package follow the best structure for its own type. This keeps build graphs explicit and ownership clear.",
    tree: `apps/
  <app>/             # deployable units (follow backend/frontend layout)
packages/
  <package>/         # reusable libraries (follow library layout)
    src/
    package.json
package.json         # workspaces
tooling/             # shared eslint/tsconfig/build config`,
    expects: ["apps", "packages"],
  },
  unknown: {
    recommended: "layered",
    rationale:
      "Group code by responsibility (entry points, core logic, IO adapters, config) so the " +
      "architecture is legible even before a framework convention is adopted.",
    tree: `src/
  core/              # business logic
  adapters/          # IO boundaries
  config/
tests/`,
    expects: ["core"],
  },
};

/** Produce folder-structure advice: classify current, recommend target, diff gaps. */
export function adviseFolders(ctx: ProjectContext): FolderAdvice {
  const projectType = ctx.detection.projectType;
  const template = TEMPLATES[projectType] ?? TEMPLATES.unknown;
  const current = classifyStructure(ctx);
  const dirs = dirNameSet(ctx);

  const gaps: string[] = [];
  for (const expected of template.expects) {
    if (!dirs.has(expected)) {
      gaps.push(`No \`${expected}/\` directory — recommended for ${projectType} projects.`);
    }
  }
  if (current === "flat") {
    gaps.push(
      "Source files are largely flat (little directory nesting); introduce the layers below.",
    );
  }
  if (current !== "unknown" && current !== template.recommended && current !== "flat") {
    gaps.push(
      `Current layout reads as "${current}"; consider migrating toward "${template.recommended}" for this project type.`,
    );
  }

  return {
    current,
    recommended: template.recommended,
    projectType,
    rationale: template.rationale,
    proposedTree: template.tree,
    gaps,
  };
}
