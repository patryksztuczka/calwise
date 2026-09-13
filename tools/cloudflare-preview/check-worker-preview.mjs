const workerName = "calwise-api";
const expectedSettings = { enabled: false, previews_enabled: true };

export const validatePreviewSettings = (payload) => {
  if (payload?.success !== true || payload.result === undefined) {
    const message =
      payload?.errors?.map((error) => error.message).join("; ") || "unknown API error";
    throw new Error(`Could not read Cloudflare Worker preview settings: ${message}`);
  }

  const { enabled, previews_enabled: previewsEnabled } = payload.result;
  if (
    enabled !== expectedSettings.enabled ||
    previewsEnabled !== expectedSettings.previews_enabled
  ) {
    throw new Error(
      `Worker preview routing is not configured: expected workers_dev=false and preview_urls=true, got workers_dev=${String(enabled)} and preview_urls=${String(previewsEnabled)}. Enable Preview URLs for calwise-api under Workers & Pages > Settings > Domains & Routes.`,
    );
  }
};

const main = async () => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (accountId === undefined || apiToken === undefined) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required");
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/workers/scripts/${workerName}/subdomain`,
    { headers: { authorization: `Bearer ${apiToken}` } },
  );
  const payload = await response.json();
  validatePreviewSettings(payload);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
