import { loadEnv, type Plugin } from "vite-plus";

export function installIdentity(variant: string) {
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
      display: "standalone",
      background_color: "#0B0E0D",
      theme_color: color,
      icons: [192, 512].map((size) => ({
        src: icon(size),
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "any",
      })),
    },
  };
}

export function installIdentityPlugin(): Plugin {
  let identity = installIdentity("production");
  let manifest = "";
  return {
    name: "calwise-install-identity",
    configResolved(config) {
      identity = installIdentity(
        loadEnv(config.mode, config.envDir, "VITE_").VITE_APP_VARIANT ??
          (config.mode === "development" ? "dev" : "production"),
      );
      manifest = JSON.stringify(identity.manifest, null, 2);
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?")[0] !== "/manifest.webmanifest") return next();
        response.setHeader("Content-Type", "application/manifest+json");
        response.setHeader("Cache-Control", "no-cache");
        response.end(manifest);
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "manifest.webmanifest", source: manifest });
    },
    transformIndexHtml(html) {
      return {
        html: html.replace(
          /<title>.*?<\/title>/,
          `<title>${identity.name} · Wyszukiwarka produktów</title>`,
        ),
        tags: [
          {
            tag: "link",
            attrs: { rel: "manifest", href: "/manifest.webmanifest" },
            injectTo: "head",
          },
          {
            tag: "link",
            attrs: { rel: "icon", type: "image/png", sizes: "32x32", href: identity.icon(32) },
            injectTo: "head",
          },
          {
            tag: "link",
            attrs: { rel: "apple-touch-icon", sizes: "180x180", href: identity.icon(180) },
            injectTo: "head",
          },
          {
            tag: "meta",
            attrs: { name: "apple-mobile-web-app-title", content: identity.name },
            injectTo: "head",
          },
          {
            tag: "meta",
            attrs: { name: "theme-color", content: identity.color },
            injectTo: "head",
          },
        ],
      };
    },
  };
}
