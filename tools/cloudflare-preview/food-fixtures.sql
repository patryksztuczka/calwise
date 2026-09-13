INSERT INTO products (
  barcode, name, brands, package_quantity, serving_size,
  energy_kcal_100g, energy_kj_100g, fat_100g, saturated_fat_100g,
  carbohydrates_100g, sugars_100g, fiber_100g, protein_100g,
  salt_100g, sodium_100g, countries, categories, allergens, traces,
  data_quality_errors, image_url, thumbnail_url, source_url, source_modified_at
) VALUES
  (
    '5900000000001', 'Preview oat yogurt', 'Calwise fixtures', '150 g', '150 g',
    82, 343, 3.2, 0.4, 10.1, 5.0, 1.1, 2.8,
    0.12, 0.048, '["Poland"]', '["Plant-based foods"]', '[]', '[]',
    '[]', NULL, NULL, 'https://example.invalid/calwise-preview/oat-yogurt', 0
  ),
  (
    '5900000000002', 'Preview rye bread', 'Calwise fixtures', '500 g', '40 g',
    244, 1021, 2.1, 0.3, 46.0, 2.8, 6.5, 8.4,
    1.1, 0.44, '["Poland"]', '["Breads"]', '["gluten"]', '[]',
    '[]', NULL, NULL, 'https://example.invalid/calwise-preview/rye-bread', 0
  )
ON CONFLICT(barcode) DO UPDATE SET
  name = excluded.name,
  brands = excluded.brands,
  energy_kcal_100g = excluded.energy_kcal_100g,
  fat_100g = excluded.fat_100g,
  carbohydrates_100g = excluded.carbohydrates_100g,
  protein_100g = excluded.protein_100g;
