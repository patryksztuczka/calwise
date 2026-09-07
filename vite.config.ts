import { defineConfig } from "vite-plus";
import oxfmtrc from "./.oxfmtrc.json" with { type: "json" };
import oxlintrc from "./.oxlintrc.json" with { type: "json" };

const { $schema: _fmtSchema, ...fmt } = oxfmtrc;
const { $schema: _lintSchema, ...lint } = oxlintrc;

export default defineConfig({ fmt, lint });
