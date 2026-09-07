CREATE VIRTUAL TABLE products_fts USING fts5(
  search_name, search_brands,
  content='products', content_rowid='id',
  tokenize='unicode61 remove_diacritics 2', prefix='2 3 4'
);
--> statement-breakpoint
CREATE TRIGGER products_ai AFTER INSERT ON products BEGIN
  INSERT INTO products_fts(rowid, search_name, search_brands)
  VALUES (new.id, new.search_name, new.search_brands);
END;
--> statement-breakpoint
CREATE TRIGGER products_ad AFTER DELETE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, search_name, search_brands)
  VALUES ('delete', old.id, old.search_name, old.search_brands);
END;
--> statement-breakpoint
CREATE TRIGGER products_au AFTER UPDATE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, search_name, search_brands)
  VALUES ('delete', old.id, old.search_name, old.search_brands);
  INSERT INTO products_fts(rowid, search_name, search_brands)
  VALUES (new.id, new.search_name, new.search_brands);
END;
--> statement-breakpoint
INSERT INTO products_fts(products_fts) VALUES ('rebuild');
