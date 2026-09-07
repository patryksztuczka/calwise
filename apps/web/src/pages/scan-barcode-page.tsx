import { ArrowLeft, ScanBarcode } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { IconButton } from "../components/icon-button";
import { BarcodeLookup } from "../modules/food/barcode-lookup";
import { BarcodeScanner } from "../modules/scanner/barcode-scanner";

export default function ScanBarcodePage() {
  const [code, setCode] = useState<string | null>(null);
  const location = useLocation();
  const searchUrl = `/log-food${location.search}`;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex h-11 items-center gap-3.5">
        <IconButton render={<Link to={searchUrl} aria-label="Back to product search" />}>
          <ArrowLeft size={21} aria-hidden="true" />
        </IconButton>
        <h1 className="font-display text-30 font-bold italic">SCAN BARCODE</h1>
      </header>
      <p className="text-10 font-semibold tracking-[1px] text-muted">ON-DEVICE SCAN</p>
      {code === null ? (
        <BarcodeScanner onScan={setCode} />
      ) : (
        <div
          aria-hidden="true"
          className="flex aspect-[350/548] items-center justify-center rounded-18 border border-line bg-surface text-muted"
        >
          <ScanBarcode size={72} />
        </div>
      )}
      <div className="flex flex-col gap-3 text-center">
        <p className="text-14 font-semibold">Scan the barcode on the packaging.</p>
        <p className="text-12 leading-relaxed text-muted">
          We'll look up the product and its nutrition. Nothing is added to your meals.
        </p>
      </div>
      {code !== null && (
        <BarcodeLookup
          key={code}
          code={code}
          searchUrl={searchUrl}
          onDismiss={() => setCode(null)}
        />
      )}
    </div>
  );
}
