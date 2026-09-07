# Vite+ as the workspace toolchain

We use Vite+ for frontend development and builds, Oxlint, Oxfmt, and workspace task orchestration instead of adding Turbo or Nx. Wrangler handles the Workers runtime and deployment, and Playwright verifies the browser-to-D1 connection against that runtime.

The root `vite.config.ts` imports `.oxlintrc.json` and `.oxfmtrc.json`, which remain the shared configuration for editors and commands. Catalog versions for bundled tools must track Vite+.
