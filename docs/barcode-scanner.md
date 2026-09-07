# Barcode scanner prototype

Run `pnpm --filter @calwise/web dev` and open `http://localhost:5173`. The scanner is the default view; text search is still available. Camera access starts only after pressing "Włącz aparat".

For a phone, serve the app through a trusted HTTPS origin or HTTPS tunnel. Plain HTTP on a LAN IP cannot request camera access. The existing Vite API proxy is needed for text search; barcode lookups call Open Food Facts directly and do not require the local API.

## Decode path

- Use native `BarcodeDetector` if it advertises EAN-13, EAN-8, and UPC-A support.
- Otherwise load the bundled ZXing-C++ WebAssembly reader in a dedicated worker. No CDN dependency. Camera startup and WASM initialization run concurrently.
- Request the rear camera, ideally 1920 × 1080 at 30 fps. Request continuous autofocus if advertised. Torch and zoom controls appear only when advertised by the camera.
- Decode at most about 15 frames per second, with only one frame in flight. Try the central half of the image on three frames, then the whole image on the fourth. Cap decode width at 1280 pixels. Keep camera pixels out of React state.
- Validate the GTIN check digit, accept the first valid read, stop the camera, and display the code immediately. Decode images stay on the device.
- Fetch nutrition separately by code. A slow or failed network request does not undo a successful scan. Cache lookups for five minutes with React Query and cancel unused requests.

The camera supports EAN-8, EAN-13 and UPC-A. Manual entry additionally accepts GTIN-14. QR, Data Matrix and compressed UPC-E are not supported. Barcode lookup uses the global food database, unlike text search's Poland filter. Missing nutrition remains missing rather than becoming zero.

## Measuring speed

The result shows the successful decode's duration, including worker transfer overhead, and elapsed time from camera/decoder readiness to detection. Neither includes permission prompts, camera startup, WASM initialization or product lookup. These are measurements for that scan, not a promised latency or a benchmark across devices.

Test on Android Chrome and iPhone Safari, including standalone PWA mode once the app has a manifest and service worker:

1. Compare cold and warm startup. Point the camera at a code before starting, then repeat with a code brought into view after startup.
2. Try small labels, glare, dim lighting, sideways barcodes and products held at different distances. Compare native and WASM results across phones.
3. Deny permission, stop during a permission prompt, switch to text search, background the app and scan again. Confirm the camera indicator goes out.
4. Disconnect the network after loading the decoder. A code should still be read; lookup should report failure without losing the code. Test manual entry and retry.
5. Check successful, missing and incomplete products. Compare nutrition against the physical label.

Automated tests cover check digits, crop dimensions, response parsing, camera lifecycle, and real WASM decoding of generated EAN/UPC images. They do not measure autofocus, handheld recognition or end-to-end phone latency.

```sh
pnpm exec vp test --project unit apps/web/src/scanner
pnpm --filter @calwise/web typecheck
pnpm --filter @calwise/web build
```

This adds a browser scanner prototype, not full PWA installation or offline asset caching. The first WASM load and uncached nutrition lookups require a network connection.
