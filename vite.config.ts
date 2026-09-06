import { defineConfig } from "vite-plus";
import oxfmtrc from "./.oxfmtrc.json" with { type: "json" };
import oxlintrc from "./.oxlintrc.json" with { type: "json" };

// .oxfmtrc.json and .oxlintrc.json are the single source of truth for
// formatting/linting (used by editors and the standalone oxfmt/oxlint CLIs).
// vp fmt / vp lint / vp check only read vite.config, so we pass them through.
const { $schema: _fmtSchema, ...fmt } = oxfmtrc;
const { $schema: _lintSchema, ...lint } = oxlintrc;

export default defineConfig({
  fmt,
  lint,
  test: {
    // .agent-sources holds read-only source mirrors for reference — never test them
    projects: [
      {
        test: {
          name: "unit",
          include: ["**/*.test.ts"],
          exclude: [
            "**/node_modules/**",
            "**/dist/**",
            "**/.agent-sources/**",
            "**/*-integration.test.ts",
          ],
        },
      },
      {
        test: {
          name: "integration",
          include: ["**/*-integration.test.ts"],
          exclude: ["**/node_modules/**", "**/dist/**", "**/.agent-sources/**"],
          // Spins up an ephemeral postgres via testcontainers and applies migrations
          globalSetup: ["./apps/api/test/integration-setup.ts"],
        },
      },
    ],
  },
});
