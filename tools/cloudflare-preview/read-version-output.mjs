import { readFile } from "node:fs/promises";

export const getPreviewAliasUrl = (contents, expectedAlias) => {
  const records = contents
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line));
  const upload = records.findLast((record) => record.type === "version-upload");
  if (upload === undefined) {
    throw new Error("Wrangler did not write a version-upload result");
  }
  if (upload.worker_name !== "calwise-api") {
    throw new Error(`Wrangler uploaded unexpected Worker ${String(upload.worker_name)}`);
  }
  if (upload.preview_alias_url === null || upload.preview_alias_url === undefined) {
    throw new Error(
      "Cloudflare did not create an aliased preview URL. Confirm Preview URLs are enabled for calwise-api.",
    );
  }

  const url = new URL(upload.preview_alias_url);
  if (
    url.protocol !== "https:" ||
    !url.hostname.startsWith(`${expectedAlias}-calwise-api.`) ||
    !url.hostname.endsWith(".workers.dev") ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error(
      `Wrangler returned an unexpected preview alias URL: ${upload.preview_alias_url}`,
    );
  }
  return url.origin;
};

const [outputPath, expectedAlias] = process.argv.slice(2);
if (outputPath !== undefined && expectedAlias !== undefined) {
  console.log(getPreviewAliasUrl(await readFile(outputPath, "utf8"), expectedAlias));
}
