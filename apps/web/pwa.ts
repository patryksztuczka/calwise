import { loadEnv, type Plugin } from "vite-plus";
import { VitePWA, type VitePWAOptions } from "vite-plugin-pwa";

export function pwaBranding(variant: string) {
  if (variant !== "dev" && variant !== "production") {
    throw new Error("VITE_APP_VARIANT must be dev or production");
  }
  const name = variant === "dev" ? "Calwise Dev" : "Calwise";
  const color = variant === "dev" ? "#1765D8" : "#D2F534";
  const icon = (size: number) => `/icons/${variant}/${size}.png`;
  return {
    name,
    color,
    icon,
    manifest: {
      id: "/",
      name,
      short_name: name,
      lang: "pl",
      start_url: "/",
      scope: "/",
      display: "standalone" as const,
      background_color: "#0B0E0D",
      theme_color: color,
      icons: [192, 512].map((size) => ({
        src: icon(size),
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "any" as const,
      })),
    },
  };
}

export function pwaOptions(variant: string): Partial<VitePWAOptions> {
  return {
    manifest: pwaBranding(variant).manifest,
    // Use the manifest without registering the generated service worker.
    injectRegister: false,
    includeManifestIcons: false,
    devOptions: { enabled: true },
    strategies: "injectManifest",
    srcDir: "src",
    filename: "sw.js",
    injectManifest: { injectionPoint: "" },
  };
}

function variantFor(mode: string, envDir: string | false) {
  const env = envDir === false ? process.env : loadEnv(mode, envDir, "VITE_");
  return env.VITE_APP_VARIANT ?? (mode === "development" ? "dev" : "production");
}

export function pwaPlugins() {
  let branding = pwaBranding("production");
  // Vite PWA handles the manifest; these tags describe browser and Apple icons.
  const metadata: Plugin = {
    name: "calwise-pwa-metadata",
    configResolved(config) {
      branding = pwaBranding(variantFor(config.mode, config.envDir));
    },
    transformIndexHtml(html) {
      return {
        html: html.replace(
          /<title>.*?<\/title>/,
          `<title>${branding.name} · Wyszukiwarka produktów</title>`,
        ),
        tags: [
          {
            tag: "link",
            attrs: { rel: "icon", type: "image/png", sizes: "32x32", href: branding.icon(32) },
            injectTo: "head",
          },
          {
            tag: "link",
            attrs: { rel: "apple-touch-icon", sizes: "180x180", href: branding.icon(180) },
            injectTo: "head",
          },
          {
            tag: "meta",
            attrs: { name: "apple-mobile-web-app-title", content: branding.name },
            injectTo: "head",
          },
          {
            tag: "meta",
            attrs: { name: "theme-color", content: branding.color },
            injectTo: "head",
          },
        ],
      };
    },
  };
  return [
    metadata,
    ...VitePWA({
      integration: {
        configureOptions(config, options) {
          Object.assign(options, pwaOptions(variantFor(config.mode, config.envDir)));
        },
      },
    }),
  ];
}
