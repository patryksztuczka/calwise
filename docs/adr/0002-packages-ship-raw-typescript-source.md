# Packages ship raw TypeScript source

Workspace packages export their `src/*.ts(x)` files directly through `exports` maps — no build step, no `dist`, no declaration emit anywhere except the web bundle. The api runs on Node 26 native type stripping (`node src/index.ts`), and cross-package types resolve through pnpm workspace symlinks. This removes a whole class of build orchestration (project references, watch pipelines, stale-dist bugs) at the cost of requiring every consumer to compile our source itself — acceptable because all packages are private to this workspace.

## Consequences

- Type-level syntax must be erasable (`erasableSyntaxOnly`), and Node-resolved imports use explicit `.ts`/`.tsx` extensions.
- Tailwind scans `packages/ui` source directly (`@source` in `apps/web/src/index.css`), since no built CSS exists.
