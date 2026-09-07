"""Snapshot columns and their catalog field names, shared by extraction and import."""

TEXT_FIELDS = {
    "code": "barcode",
    "product_name": "name",
    "brands": "brands",
    "quantity": "package_quantity",
    "serving_size": "serving_size",
    "url": "source_url",
    "image_url": "image_url",
    "image_small_url": "thumbnail_url",
}
NUMBER_FIELDS = {
    "energy-kcal_100g": "energy_kcal_100g",
    "energy-kj_100g": "energy_kj_100g",
    "fat_100g": "fat_100g",
    "saturated-fat_100g": "saturated_fat_100g",
    "carbohydrates_100g": "carbohydrates_100g",
    "sugars_100g": "sugars_100g",
    "fiber_100g": "fiber_100g",
    "proteins_100g": "protein_100g",
    "salt_100g": "salt_100g",
    "sodium_100g": "sodium_100g",
    "last_modified_t": "source_modified_at",
}
TAG_FIELDS = {
    "countries_tags": "countries",
    "categories_tags": "categories",
    "allergens": "allergens",
    "traces_tags": "traces",
    "data_quality_errors_tags": "data_quality_errors",
}
