-- unicode61 folds diacritics, but ł requires an explicit replacement.
-- FTS owns the folded text; products keeps only the source fields.
CREATE VIRTUAL TABLE products_fts USING fts5(
  name, brands,
  tokenize='unicode61 remove_diacritics 2', prefix='2 3 4'
);
--> statement-breakpoint
CREATE TRIGGER products_ai AFTER INSERT ON products BEGIN
  INSERT INTO products_fts(rowid, name, brands)
  VALUES (new.id, replace(replace(new.name, 'ł', 'l'), 'Ł', 'l'),
          replace(replace(coalesce(new.brands, ''), 'ł', 'l'), 'Ł', 'l'));
END;
--> statement-breakpoint
CREATE TRIGGER products_ad AFTER DELETE ON products BEGIN
  DELETE FROM products_fts WHERE rowid = old.id;
END;
--> statement-breakpoint
CREATE TRIGGER products_au AFTER UPDATE ON products BEGIN
  DELETE FROM products_fts WHERE rowid = old.id;
  INSERT INTO products_fts(rowid, name, brands)
  VALUES (new.id, replace(replace(new.name, 'ł', 'l'), 'Ł', 'l'),
          replace(replace(coalesce(new.brands, ''), 'ł', 'l'), 'Ł', 'l'));
END;
--> statement-breakpoint
INSERT INTO products_fts(rowid, name, brands)
SELECT id, replace(replace(name, 'ł', 'l'), 'Ł', 'l'),
       replace(replace(coalesce(brands, ''), 'ł', 'l'), 'Ł', 'l')
FROM products;
