import type { FoodBarcodeResult, FoodSearchResult, Product } from "../food-types";

const product: Product = {
  barcode: "0000000000001",
  name: "Żółty ser testowy",
  brands: "Calwise Test",
  packageQuantity: "200 g",
  servingSize: "20 g",
  energyKcal100g: 350,
  energyKj100g: null,
  fat100g: 25,
  saturatedFat100g: null,
  carbohydrates100g: 0,
  sugars100g: null,
  fiber100g: null,
  protein100g: 25,
  salt100g: null,
  sodium100g: null,
  countries: [],
  categories: [],
  allergens: [],
  traces: [],
  dataQualityErrors: [],
  imageUrl: null,
  thumbnailUrl: null,
  sourceUrl: "https://world.openfoodfacts.org/product/0000000000001",
  sourceModifiedAt: 0,
};

const attribution = {
  name: "Open Food Facts contributors",
  url: "https://world.openfoodfacts.org",
  license: "ODbL-1.0",
};
export const searchResult: FoodSearchResult = { products: [product], attribution };
export const barcodeResult: FoodBarcodeResult = { product, attribution };
