import json
import sqlite3
import unittest
from pathlib import Path

from prepare_import import statement

ROOT = Path(__file__).resolve().parents[2]


class ImportTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.addCleanup(self.db.close)
        for migration in sorted((ROOT / "packages/food-database/migrations").glob("*/migration.sql")):
            self.db.executescript(migration.read_text())
        self.product = json.loads((Path(__file__).parent / "fixtures/poland.jsonl").read_text())

    def test_import_is_repeatable_and_searches_polish_without_accents(self):
        sql = statement(self.product)
        self.db.executescript(sql)
        self.db.executescript(sql)
        self.assertEqual(self.db.execute("SELECT count(*) FROM products").fetchone()[0], 1)
        self.assertEqual(self.db.execute("SELECT barcode, carbohydrates_100g, fiber_100g FROM products").fetchone(), ("0000000000001", 0, None))
        self.assertEqual(self.db.execute("SELECT count(*) FROM products_fts WHERE products_fts MATCH ?", ('"zolty"* AND "ser"*',)).fetchone()[0], 1)
        self.product["name"] = "O'Brien mleko"
        self.db.executescript(statement(self.product))
        self.assertEqual(self.db.execute("SELECT count(*) FROM products_fts WHERE products_fts MATCH 'zolty' ").fetchone()[0], 0)
        self.assertEqual(self.db.execute("SELECT count(*) FROM products_fts WHERE products_fts MATCH 'mleko' ").fetchone()[0], 1)
        self.db.execute("DELETE FROM products")
        self.assertEqual(self.db.execute("SELECT count(*) FROM products_fts WHERE products_fts MATCH 'mleko' ").fetchone()[0], 0)

    def test_incomplete_and_non_polish_products_are_excluded(self):
        self.product["protein_100g"] = None
        self.assertIsNone(statement(self.product))
        self.product["protein_100g"] = 25
        self.product["countries"] = ["en:germany"]
        self.assertIsNone(statement(self.product))

    def test_sql_injection_remains_literal_text(self):
        self.product["name"] = "'); DROP TABLE products; --"
        self.db.executescript(statement(self.product))
        self.assertEqual(self.db.execute("SELECT name FROM products").fetchone()[0], self.product["name"])


if __name__ == "__main__":
    unittest.main()
