#!/usr/bin/env python3
"""Prepare a one-time D1 SQL import from the extracted Poland JSONL."""

import argparse
import json
import math
import unicodedata
from pathlib import Path

TEXT = ["barcode", "name", "brands", "package_quantity", "serving_size", "source_url", "image_url", "thumbnail_url"]
NUMBERS = ["energy_kcal_100g", "energy_kj_100g", "fat_100g", "saturated_fat_100g", "carbohydrates_100g", "sugars_100g", "fiber_100g", "protein_100g", "salt_100g", "sodium_100g", "source_modified_at"]
TAGS = ["countries", "categories", "allergens", "traces", "data_quality_errors"]
REQUIRED = ["name", "energy_kcal_100g", "fat_100g", "carbohydrates_100g", "protein_100g"]
COLUMNS = TEXT + NUMBERS + TAGS + ["search_name", "search_brands"]


def normalize(value):
    return "".join(c for c in unicodedata.normalize("NFD", value or "") if unicodedata.category(c) != "Mn").lower().replace("ł", "l")


def literal(value):
    if value is None:
        return "NULL"
    if isinstance(value, str):
        if "\x00" in value:
            raise ValueError("NUL bytes cannot be imported as SQL text")
        return "'" + value.replace("'", "''") + "'"
    if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value):
        return str(value)
    raise ValueError(f"Unsupported SQL value: {value!r}")


def statement(product):
    if "en:poland" not in product["countries"] or any(product.get(key) is None for key in REQUIRED):
        return None
    if not product["name"].strip():
        return None
    if not isinstance(product["barcode"], str) or not product["barcode"].isdigit() or not 4 <= len(product["barcode"]) <= 24:
        raise ValueError("Barcode must be 4–24 digits stored as text")
    for key in NUMBERS:
        value = product.get(key)
        if value is not None and (not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value) or value < 0):
            raise ValueError(f"Invalid nutrient or timestamp: {key}")
    values = [product.get(key) for key in TEXT + NUMBERS]
    values += [json.dumps(product[key], ensure_ascii=False) for key in TAGS]
    values += [normalize(product["name"]), normalize(product.get("brands"))]
    updates = ", ".join(f"{column}=excluded.{column}" for column in COLUMNS if column != "barcode")
    sql = f"INSERT INTO products ({', '.join(COLUMNS)}) VALUES ({', '.join(literal(value) for value in values)}) ON CONFLICT(barcode) DO UPDATE SET {updates};\n"
    if len(sql.encode()) > 95_000:
        raise ValueError("Product exceeds D1 SQL statement size budget")
    return sql


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    if args.input.resolve() == args.output.resolve():
        parser.error("Output must not overwrite the input")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(".partial")
    imported = skipped = 0
    with args.input.open(encoding="utf-8") as source, temporary.open("w", encoding="utf-8") as output:
        output.write("-- Open Food Facts contributors https://world.openfoodfacts.org, ODbL-1.0\n")
        for line in source:
            sql = statement(json.loads(line))
            if sql is None:
                skipped += 1
            else:
                output.write(sql)
                imported += 1
    temporary.replace(args.output)
    print(json.dumps({"products": imported, "skipped_incomplete": skipped, "sql_bytes": args.output.stat().st_size}))


if __name__ == "__main__":
    main()
