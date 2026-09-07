import unittest

from extract_poland import extract, number


class ExtractTests(unittest.TestCase):
    def test_exact_country_tag_not_origin_or_partial_match(self):
        for row in [
            {"countries_tags": "en:poland-other"},
            {"origins_tags": "en:poland"},
            {"countries_tags": "en:germany"},
        ]:
            self.assertIsNone(extract(row))

    def test_preserves_barcode_and_zero_but_not_missing_nutrients(self):
        result = extract({
            "countries_tags": "en:germany, en:poland",
            "code": "00123456789",
            "product_name": "Żółty ser",
            "fat_100g": "0",
            "proteins_100g": "12.5",
            "quantity": "500 ml",
        })
        self.assertEqual(result["barcode"], "00123456789")
        self.assertEqual(result["name"], "Żółty ser")
        self.assertEqual(result["fat_100g"], 0)
        self.assertEqual(result["protein_100g"], 12.5)
        self.assertIsNone(result["energy_kcal_100g"])
        self.assertEqual(result["package_quantity"], "500 ml")

    def test_invalid_numbers_are_null(self):
        for value in [None, "", "unknown", "NaN", "inf", "-1"]:
            self.assertIsNone(number(value))


if __name__ == "__main__":
    unittest.main()
