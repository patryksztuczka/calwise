import { Barcode, Camera, Flashlight, FlashlightOff } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { IconButton } from "../../components/icon-button";
import { PrimaryAction } from "../../components/primary-action";
import { startCameraScanner, type ScannerState } from "./camera-scanner";

interface BarcodeScannerProps {
  readonly onScan: (code: string) => void;
}

/** Pencil's scanner viewport. Camera pixels stay on the device; onScan receives only the code. */
export function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const [attempt, setAttempt] = useState(0);
  return (
    <ScannerCamera key={attempt} onScan={onScan} onRetry={() => setAttempt((value) => value + 1)} />
  );
}

interface ScannerCameraProps extends BarcodeScannerProps {
  readonly onRetry: () => void;
}

function ScannerCamera({ onScan, onRetry }: ScannerCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<ReturnType<typeof startCameraScanner> | null>(null);
  const [state, setState] = useState<ScannerState>({ kind: "starting" });
  const handleScan = useEffectEvent(onScan);

  useEffect(() => {
    if (!videoRef.current || !guideRef.current) return;
    const session = startCameraScanner(videoRef.current, guideRef.current, handleScan, setState);
    sessionRef.current = session;
    return () => {
      session.stop();
      sessionRef.current = null;
    };
  }, []);

  const scanning = state.kind === "scanning";
  const torchOn = scanning && state.torchOn;
  const torchAvailable = scanning && state.torchAvailable;
  const interrupted = state.kind === "error" || state.kind === "paused";

  return (
    <div className="relative aspect-[350/548] w-full shrink-0 overflow-hidden rounded-18 border border-line bg-surface">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        aria-label="Live barcode camera"
        className="absolute inset-0 size-full object-cover"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 bg-bg/70 px-[18px] py-[19px] text-muted">
        <Camera size={16} aria-hidden="true" />
        <span className="text-9 font-semibold tracking-[1px]">AUTO SCAN</span>
      </div>

      <div
        ref={guideRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[8%] top-[30%] h-[32%]"
      >
        <span className="absolute top-0 left-0 size-[26px] rounded-tl-2 border-t-[3px] border-l-[3px] border-lime" />
        <span className="absolute top-0 right-0 size-[26px] rounded-tr-2 border-t-[3px] border-r-[3px] border-lime" />
        <span className="absolute bottom-0 left-0 size-[26px] rounded-bl-2 border-b-[3px] border-l-[3px] border-lime" />
        <span className="absolute right-0 bottom-0 size-[26px] rounded-br-2 border-r-[3px] border-b-[3px] border-lime" />
        {!scanning && !interrupted && (
          <Barcode className="absolute top-1/2 left-1/2 h-[72px] w-[140px] -translate-1/2 text-track" />
        )}
        <span className="absolute inset-x-2.5 top-1/2 h-px bg-lime/65" />
      </div>

      {!interrupted && (
        <>
          <p
            role="status"
            className="absolute inset-x-3 top-[67%] rounded-8 bg-bg/70 px-2 py-2 text-center text-11 text-white"
          >
            {scanning
              ? "Keep the barcode inside the frame."
              : "Starting camera. Allow access when prompted."}
          </p>
          <div className="absolute inset-x-0 bottom-[5.5%] flex flex-col items-center gap-2.5">
            <IconButton
              aria-label="Toggle torch"
              aria-pressed={torchOn}
              disabled={!torchAvailable || (state.kind === "scanning" && state.torchBusy)}
              onClick={() => void sessionRef.current?.toggleTorch()}
              className="bg-surface"
            >
              {torchOn ? (
                <FlashlightOff size={21} aria-hidden="true" />
              ) : (
                <Flashlight size={21} aria-hidden="true" />
              )}
            </IconButton>
            <span className="rounded-8 bg-bg/70 px-2 py-1 text-10 text-white">
              {scanning && !torchAvailable
                ? "Torch unavailable"
                : torchOn
                  ? "Torch on"
                  : "Torch off"}
            </span>
          </div>
        </>
      )}
      {interrupted && (
        <div className="absolute inset-0 flex flex-col justify-center gap-5 bg-bg/95 px-7">
          <p
            role={state.kind === "error" ? "alert" : "status"}
            className="text-center text-14 leading-relaxed"
          >
            {state.kind === "error" ? state.message : "Camera paused while you were away."}
          </p>
          <PrimaryAction onClick={onRetry}>
            {state.kind === "paused" ? "RESUME SCANNING" : "TRY AGAIN"}
          </PrimaryAction>
        </div>
      )}
    </div>
  );
}
