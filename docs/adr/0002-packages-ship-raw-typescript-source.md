# Packages ship raw TypeScript source

Private workspace packages export their source files directly, without separate package builds or declaration output. Wrangler bundles backend dependencies and Vite+ bundles frontend dependencies, avoiding stale package build artifacts and extra watch pipelines.

Type syntax remains erasable, and backend imports use explicit `.ts` extensions. Node 26 runs repository scripts, not the production API.
