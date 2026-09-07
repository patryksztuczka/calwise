#!/usr/bin/env python3
"""Extract products sold in Poland from the Open Food Facts gzipped TSV."""

import argparse
import csv
import gzip
import hashlib
import json
import math
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from fields import NUMBER_FIELDS, TAG_FIELDS, TEXT_FIELDS

SOURCE_URL = "https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz"


def tags(value):
    return [tag.strip() for tag in value.split(",") if tag.strip()]


def number(value):
    try:
        result = float(value)
    except (ValueError, TypeError):
        return None
    return result if math.isfinite(result) and result >= 0 else None


def extract(row):
    if "en:poland" not in tags(row.get("countries_tags") or ""):
        return None
    product = {
        target: (row.get(source) or "").strip() or None
        for source, target in TEXT_FIELDS.items()
    }
    product.update({target: number(row.get(source)) for source, target in NUMBER_FIELDS.items()})
    product.update({target: tags(row.get(source) or "") for source, target in TAG_FIELDS.items()})
    return product


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("output", type=Path, help="Output JSONL path")
    args = parser.parse_args()
    if args.snapshot.resolve() == args.output.resolve():
        parser.error("Output must not overwrite the snapshot")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    csv.field_size_limit(100_000_000)
    counts = Counter()
    missing = Counter()
    seen = set()
    digest = hashlib.sha256()
    with args.snapshot.open("rb") as snapshot:
        for chunk in iter(lambda: snapshot.read(1024 * 1024), b""):
            digest.update(chunk)
    temporary = args.output.with_suffix(args.output.suffix + ".partial")
    with gzip.open(args.snapshot, "rt", encoding="utf-8", newline="") as source, temporary.open("w", encoding="utf-8") as output:
        reader = csv.DictReader(source, delimiter="\t")
        required = set(TEXT_FIELDS) | set(NUMBER_FIELDS) | set(TAG_FIELDS)
        absent = required - set(reader.fieldnames or [])
        if absent:
            raise ValueError(f"Missing snapshot columns: {sorted(absent)}")
        for row in reader:
            counts["snapshot_rows"] += 1
            product = extract(row)
            if product is None:
                continue
            counts["poland_rows"] += 1
            barcode = product["barcode"]
            if not barcode:
                counts["skipped_missing_barcode"] += 1
                continue
            if barcode in seen:
                raise ValueError(f"Duplicate barcode in Poland selection: {barcode}")
            seen.add(barcode)
            missing.update(key for key, value in product.items() if value is None)
            output.write(json.dumps(product, ensure_ascii=False, allow_nan=False) + "\n")
            counts["exported_rows"] += 1
    temporary.replace(args.output)
    manifest = {
        "source_url": SOURCE_URL,
        "snapshot": str(args.snapshot.resolve()),
        "snapshot_sha256": digest.hexdigest(),
        "snapshot_bytes": args.snapshot.stat().st_size,
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "filter": "countries_tags contains exact tag en:poland",
        "counts": dict(counts),
        "missing_fields": dict(missing),
        "output_bytes": args.output.stat().st_size,
        "license": "ODbL 1.0",
        "attribution": "Open Food Facts contributors, https://world.openfoodfacts.org",
    }
    args.output.with_suffix(".manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
