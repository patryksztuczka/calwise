import type { FoodProduct } from "@calwise/shared/food";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { validBarcode } from "./barcode";
import { startCamera, type ScanResult } from "./camera";
import { lookupBarcode } from "./product";

export default function BarcodeScanner({
  onSelect,
  onClear,
}: {
  onSelect: (product: FoodProduct) => void;
  onClear: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);
  const [engine, setEngine] = useState("");
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [track, setTrack] = useState<MediaStreamTrack | null>(null);
  const [torch, setTorch] = useState(false);
  const [torchBusy, setTorchBusy] = useState(false);
  const [zoom, setZoom] = useState(1);
  const capabilities = track?.getCapabilities?.();
  const product = useQuery({
    queryKey: ["barcode-product", result?.code],
    queryFn: ({ signal }) => lookupBarcode(result!.code, signal),
    enabled: !!result,
    retry: false,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!running || !video.current) return;
    return startCamera(video.current, {
      ready: (cameraTrack, decoder) => {
        setTrack(cameraTrack);
        setZoom(cameraTrack.getSettings().zoom ?? 1);
        setEngine(decoder);
        setReady(true);
      },
      result: (scan) => {
        setResult(scan);
        setRunning(false);
        navigator.vibrate?.(60);
      },
      error: (message) => {
        setError(message);
        setRunning(false);
      },
    });
  }, [running]);

  function start() {
    onClear();
    setError("");
    setResult(null);
    setReady(false);
    setTrack(null);
    setTorch(false);
    setRunning(true);
  }

  return (
    <section className="scanner" aria-label="Skaner kodów kreskowych">
      <div className="scanner-heading">
        <div>
          <p className="eyebrow">SKANER KODÓW</p>
          <h2>Z etykiety prosto na talerz.</h2>
        </div>
        <span className="scanner-badge">EAN / UPC</span>
      </div>
      <div className={`camera-preview ${result ? "scan-complete" : ""}`}>
        <video ref={video} muted playsInline aria-label="Podgląd aparatu" />
        {running && ready && (
          <div className="scan-guide" aria-hidden="true">
            <span />
          </div>
        )}
        {(!running || !ready) && (
          <div className="camera-message">
            <svg viewBox="0 0 80 50" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="M12 15V5h14M54 5h14v10M68 35v10H54M26 45H12V35" strokeWidth="2" />
              <path d="M24 15v20m5-20v20m7-20v20m4-20v20m8-20v20m6-20v20" strokeWidth="3" />
            </svg>
            <h3>
              {result ? "Kod odczytany" : running ? "Uruchamiam aparat…" : "Zeskanuj kod produktu"}
            </h3>
            <p>{result ? result.code : "Skieruj tylny aparat na kod kreskowy."}</p>
            {!running && (
              <button className="scan-primary" onClick={start}>
                {result ? "Skanuj kolejny" : "Włącz aparat"}
                <span aria-hidden="true"> ↗</span>
              </button>
            )}
          </div>
        )}
        {running && (
          <div className="camera-toolbar">
            <span>{ready ? engine : "Łączenie…"}</span>
            <div>
              {ready && capabilities?.torch && (
                <button
                  disabled={torchBusy}
                  aria-pressed={torch}
                  onClick={async () => {
                    setTorchBusy(true);
                    try {
                      await track?.applyConstraints({ advanced: [{ torch: !torch }] });
                      setTorch(!torch);
                    } catch {
                      setError("Nie udało się przełączyć latarki.");
                    } finally {
                      setTorchBusy(false);
                    }
                  }}
                >
                  Latarka {torch ? "wył." : "wł."}
                </button>
              )}
              <button onClick={() => setRunning(false)}>Zatrzymaj</button>
            </div>
          </div>
        )}
      </div>
      {running && ready && capabilities?.zoom && (
        <label className="camera-zoom">
          Przybliżenie
          <input
            type="range"
            min={capabilities.zoom.min}
            max={Math.min(capabilities.zoom.max, 4)}
            step={capabilities.zoom.step || 0.1}
            value={zoom}
            onChange={(event) => {
              const value = Number(event.target.value);
              setZoom(value);
              void track
                ?.applyConstraints({ advanced: [{ zoom: value }] })
                .catch(() => setError("Nie udało się zmienić przybliżenia."));
            }}
          />
          <span>{zoom.toFixed(1)}×</span>
        </label>
      )}
      <p className="scanner-hint">
        Trzymaj cały kod w kadrze. Odsuń aparat, jeśli obraz jest nieostry. Odczyt odbywa się na
        urządzeniu, bez wysyłania zdjęć.
      </p>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {result && (
        <div className="scan-result" aria-live="polite" aria-busy={product.isFetching}>
          <div className="scan-metrics">
            <strong>{result.code}</strong>
            <span>
              {result.engine === "Ręcznie"
                ? "Kod wpisany ręcznie"
                : `${result.decodeMs} ms dekodowania · ${result.elapsedMs} ms od gotowości aparatu · ${result.engine}`}
            </span>
          </div>
          {product.isFetching ? (
            <p>Szukam produktu w Open Food Facts…</p>
          ) : product.isError ? (
            <>
              <p role="alert">
                Kod odczytany, ale nie udało się pobrać produktu. Sprawdź połączenie.
              </p>
              <button className="secondary" onClick={() => void product.refetch()}>
                Ponów pobieranie
              </button>
            </>
          ) : product.data ? (
            <div className="scan-product">
              <div>
                <span className="brand">{product.data.brand || "Marka niepodana"}</span>
                <h3>{product.data.name}</h3>
                <p>
                  {product.data.kcal === null
                    ? "Brak danych o kaloriach"
                    : `${product.data.kcal} kcal / 100 g lub ml`}
                </p>
              </div>
              <button className="scan-primary" onClick={() => onSelect(product.data!)}>
                Policz porcję ↗
              </button>
            </div>
          ) : (
            <p>Nie znaleźliśmy produktu z tym kodem. Spróbuj wyszukiwania po nazwie.</p>
          )}
          <p className="small muted">
            Wyszukiwanie kodu obejmuje światową bazę. Do Open Food Facts wysyłamy tylko numer kodu.
          </p>
        </div>
      )}
      <details className="manual-code">
        <summary>Nie możesz zeskanować? Wpisz kod ręcznie</summary>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const code = manual.replace(/\s/g, "");
            if (!validBarcode(code)) {
              setError("Wpisz poprawny kod EAN lub UPC: 8, 12, 13 lub 14 cyfr z etykiety.");
              return;
            }
            setRunning(false);
            setError("");
            onClear();
            setResult({ code, engine: "Ręcznie", decodeMs: 0, elapsedMs: 0 });
          }}
        >
          <label className="sr-only" htmlFor="manual-barcode">
            Numer kodu kreskowego
          </label>
          <input
            id="manual-barcode"
            inputMode="numeric"
            autoComplete="off"
            placeholder="np. 3017620422003"
            maxLength={24}
            value={manual}
            onChange={(event) => setManual(event.target.value)}
          />
          <button className="secondary" type="submit">
            Sprawdź kod
          </button>
        </form>
      </details>
    </section>
  );
}
