import { ArrowLeft, ScanBarcode } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { IconButton } from "../components/icon-button";
import { PrimaryAction } from "../components/primary-action";
import { BarcodeScanner } from "../modules/scanner/barcode-scanner";

export default function ScanBarcodePage() {
  const [code, setCode] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex h-11 items-center gap-3.5">
        <IconButton render={<Link to="/log-food" aria-label="Back to log food" />}>
          <ArrowLeft size={21} aria-hidden="true" />
        </IconButton>
        <h1 className="font-display text-30 font-bold italic">SCAN BARCODE</h1>
      </header>
      {code === null ? (
        <>
          <p className="text-10 font-semibold tracking-[1px] text-muted">ON-DEVICE SCAN</p>
          <BarcodeScanner onScan={setCode} />
          <div className="flex flex-col gap-3 text-center">
            <p className="text-14 font-semibold">Scan the barcode on the packaging.</p>
            <p className="text-12 leading-relaxed text-muted">
              Only the barcode is returned. Nothing is added to your meals.
            </p>
          </div>
        </>
      ) : (
        <section
          aria-labelledby="scanned-heading"
          className="flex flex-col gap-5 rounded-18 border border-success-border bg-success-soft p-6"
        >
          <ScanBarcode size={32} className="text-lime" aria-hidden="true" />
          <h2 id="scanned-heading" className="text-14 font-semibold">
            Barcode scanned
          </h2>
          <output
            aria-label="Scanned barcode"
            className="font-mono text-24 break-all select-all"
            aria-live="polite"
          >
            {code}
          </output>
          <p className="text-12 leading-relaxed text-muted">
            Camera stopped. No product lookup or meal changes.
          </p>
          <PrimaryAction onClick={() => setCode(null)}>SCAN AGAIN</PrimaryAction>
        </section>
      )}
    </div>
  );
}
