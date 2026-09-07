import { describe, expect, it } from "vite-plus/test";
import { installIdentity } from "./install-identity";

describe("install identity", () => {
  for (const [variant, name] of [
    ["dev", "Calwise Dev"],
    ["production", "Calwise"],
  ]) {
    it(`uses the ${variant} name and icons consistently`, () => {
      const identity = installIdentity(variant);
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
    expect(() => installIdentity("staging")).toThrow("VITE_APP_VARIANT must be dev or production");
  });
});
