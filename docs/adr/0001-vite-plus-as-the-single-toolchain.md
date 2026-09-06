# Vite+ as the single toolchain

We use Vite+ (`vp`) for everything the workspace needs — dev server, build, test runner (Vitest), linter (Oxlint), formatter (Oxfmt), and cached task orchestration — instead of the usual stack of Turbo/Nx plus standalone ESLint, Prettier, and Vitest. One tool and one config surface beat five tools with overlapping responsibilities; the trade-off is betting on a young toolchain (`vite-plus` 0.x) over battle-tested incumbents.

## Consequences

- `vp` only reads configuration from `vite.config.ts`, so the root config imports `.oxlintrc.json` / `.oxfmtrc.json` (kept as dotfiles for editor integration) and passes them through. The dotfiles remain the single source of truth.
- The `vitest`, `oxlint`, and `oxfmt` catalog versions must track the versions bundled by `vite-plus`.
