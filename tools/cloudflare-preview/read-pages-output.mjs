import { readFile } from "node:fs/promises";

export const getPagesAliasUrl = (contents, expectedAlias) => {
  const records = contents
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line));
  const deploy = records.findLast((record) => record.type === "pages-deploy-detailed");
  if (deploy === undefined) {
    throw new Error("Wrangler did not write a detailed Pages deployment result");
  }
  if (deploy.pages_project !== "calwise" || deploy.environment !== "preview") {
    throw new Error("Wrangler deployed to an unexpected Pages project or environment");
  }
  if (deploy.alias === null || deploy.alias === undefined) {
    throw new Error("Cloudflare did not create a Pages branch alias");
  }

  const url = new URL(deploy.alias);
  if (
    url.protocol !== "https:" ||
    !url.hostname.startsWith(`${expectedAlias}.`) ||
    !url.hostname.endsWith(".pages.dev") ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error(`Wrangler returned an unexpected Pages alias URL: ${deploy.alias}`);
  }
  return url.origin;
};

const [outputPath, expectedAlias] = process.argv.slice(2);
if (outputPath !== undefined && expectedAlias !== undefined) {
  console.log(getPagesAliasUrl(await readFile(outputPath, "utf8"), expectedAlias));
}
