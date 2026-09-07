import { ScanBarcode } from "lucide-react";
import { Link } from "react-router";
import { PrimaryAction } from "../components/primary-action";

export default function LogFoodPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-30 font-bold italic">LOG FOOD</h1>
      <p className="text-14 leading-relaxed text-muted">
        Scan packaging to read its barcode. Product search and meal logging are not available yet.
      </p>
      <PrimaryAction render={<Link to="/scan" />}>
        <ScanBarcode size={23} aria-hidden="true" />
        SCAN BARCODE
      </PrimaryAction>
    </div>
  );
}
