# Vendored anti-slop rules

Copied from https://github.com/dmmulroy/anti-slop at commit
`e8c4880471b23ab7f216fba7b27d173a6ef07d4c` using its install-anti-slop installer.
The upstream MIT license is included in `LICENSE`.

These files are owned by this repository. Review upstream changes before replacing
or customizing them.

`.oxlintrc.json` enables all 15 generic rules and the Effect rule.
`vite.config.ts` passes that configuration to Vite+, so both `pnpm lint` and
standalone Oxlint use the same rules. `.oxfmtrc.json` and `.oxlintrc.json` exclude
the vendored files and agent tooling.

Keep `@oxlint/plugins` and the catalog's `oxlint` pinned to the same exact version,
currently `1.79.0`. Keep them compatible with the Oxlint bundled by Vite+.

The Effect rule checks relative service-constructor imports. It does not enforce
package or path-alias imports.

Run `pnpm lint`, `pnpm check`, and `pnpm typecheck` to validate changes.
