# Installing Calwise

Calwise supports browser installation and home-screen shortcuts. It still requires an internet connection. `vite-plugin-pwa` generates and links the manifest. Service-worker registration is disabled, and the generated worker has no precached assets, runtime caching, or offline fallback. There is no background sync or automatic reload.

## Names and icons

| Environment        | Installed name | Icon                  |
| ------------------ | -------------- | --------------------- |
| Development server | Calwise Dev    | Blue Bite C blueprint |
| Production build   | Calwise        | Lime Bite C           |

The manifest, browser tab title, favicon, and Apple touch icon use the same variant. The icon artwork comes from the existing Calwise Pencil designs.

`pnpm --filter @calwise/web dev` uses the development identity. `pnpm --filter @calwise/web build` uses production. A production build previewed on localhost still uses the production identity.

To explicitly build the development identity:

```sh
VITE_APP_VARIANT=dev pnpm --filter @calwise/web build
```

`VITE_APP_VARIANT` accepts only `dev` or `production`. It can also be set in Vite environment files. Restart the development server or rebuild after changing it.

## Installation

Serve the app over HTTPS, or use localhost on the same device. A phone accessing a computer through its LAN IP needs HTTPS.

- Supporting desktop and Android browsers expose Install or Add to Home Screen in their address bar or menu. Automatic install prompts depend on browser support and eligibility rules.
- On iOS, use the browser's share menu and Add to Home Screen. There is no universal automatic install button.

The manifest requests a standalone window. Browser support determines the final installation behavior. Development and production on different origins have separate installations. Uninstall and reinstall if an existing shortcut retains its old name or icon.

## Deployment

Serve `/manifest.webmanifest` as `application/manifest+json`, with revalidation rather than long-lived immutable caching. Keep `/icons/` accessible. The generated manifest and icon references assume the app is hosted at the origin root, like the existing `/trpc` client URL.

## Manual device checks

Check both variants on a real Android and iOS device: installed name, home-screen icon, standalone launch, and camera access. These checks cannot be replaced by inspecting the generated manifest. Opening the installed app offline is not supported.
