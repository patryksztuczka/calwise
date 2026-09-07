import { describe, expect, it } from "vite-plus/test";
import { pwaBranding, pwaOptions } from "./pwa";

describe("PWA branding", () => {
  for (const [variant, name] of [
    ["dev", "Calwise Dev"],
    ["production", "Calwise"],
  ]) {
    it(`uses the ${variant} name and icons consistently`, () => {
      const identity = pwaBranding(variant);
      expect(identity.manifest.name).toBe(name);
      expect(identity.manifest.short_name).toBe(name);
      expect(identity.manifest.icons).toEqual(
        [192, 512].map((size) => ({
          src: `/icons/${variant}/${size}.png`,
          sizes: `${size}x${size}`,
          type: "image/png",
          purpose: "any",
        })),
      );
      expect(identity.icon(180)).toBe(`/icons/${variant}/180.png`);
      expect(identity.manifest).toMatchObject({
        id: "/",
        start_url: "/",
        scope: "/",
        display: "standalone",
        lang: "pl",
      });
    });
  }

  it("rejects unknown variants instead of silently using production branding", () => {
    expect(() => pwaBranding("staging")).toThrow("VITE_APP_VARIANT must be dev or production");
  });
});

it("does not register a worker, cache assets, or provide an offline fallback", () => {
  expect(pwaOptions("dev")).toMatchObject({
    injectRegister: false,
    includeManifestIcons: false,
    devOptions: { enabled: true },
    strategies: "injectManifest",
    srcDir: "src",
    filename: "sw.js",
    injectManifest: { injectionPoint: "" },
  });
});
