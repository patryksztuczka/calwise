import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createWorker, OEM, PSM } from "tesseract.js";
import { nutritionLinesFromTsv } from "../src/modules/scanner/nutrition-ocr.ts";
import { parseNutritionLabel } from "../src/modules/scanner/nutrition-label-parser.ts";

const fixtures = [
  fileURLToPath(new URL("../e2e/fixtures/nutrition-label.png", import.meta.url)),
  fileURLToPath(new URL("../e2e/fixtures/nutrition-label-pl.png", import.meta.url)),
];
const startedAt = performance.now();
const worker = await createWorker(["eng", "pol"], OEM.LSTM_ONLY, {
  langPath: "https://cdn.jsdelivr.net/gh/tesseract-ocr/tessdata_fast@4.1.0",
  gzip: false,
  cacheMethod: "none",
});

try {
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO,
    preserve_interword_spaces: "1",
    user_defined_dpi: "300",
  });
  const recognizeFixture = async (fixture: string) => {
    const fixtureStartedAt = performance.now();
    const { data } = await worker.recognize(fixture, {}, { text: true, tsv: true, blocks: true });
    const parsed = parseNutritionLabel(nutritionLinesFromTsv(data.tsv ?? ""));
    const words =
      data.blocks?.flatMap((block) =>
        block.paragraphs.flatMap((paragraph) => paragraph.lines.flatMap((line) => line.words)),
      ) ?? [];
    const firstWord = words[0];
    assert.ok(
      firstWord && firstWord.bbox.x1 > firstWord.bbox.x0 && firstWord.bbox.y1 > firstWord.bbox.y0,
    );
    return {
      fixture,
      elapsedMs: Math.round(performance.now() - fixtureStartedAt),
      confidence: data.confidence,
      wordCount: words.length,
      firstWord: firstWord
        ? { text: firstWord.text, confidence: firstWord.confidence, bbox: firstWord.bbox }
        : null,
      text: data.text.trim(),
      parsed,
    };
  };
  const observations = [await recognizeFixture(fixtures[0]!), await recognizeFixture(fixtures[1]!)];
  const [english, polish] = observations;
  assert.ok(english && polish);
  assert.match(english.text, /NUTRITION INFORMATION/);
  assert.match(english.text, /Per 100 ml/);
  assert.match(english.text, /168 kJ \/ 40 kcal/);
  assert.equal(english.parsed.basis, "ml");
  assert.equal(english.parsed.canPrefill, true);
  assert.deepEqual(english.parsed.values, {
    energyKj100: "168",
    energyKcal100: "40",
    protein100: "0.4",
    salt100: "0.03",
  });

  assert.match(polish.text, /WARTOŚĆ ODŻYWCZA/);
  assert.match(polish.text, /Wartość energetyczna/);
  assert.match(polish.text, /w 100 g/);
  assert.equal(polish.parsed.basis, "g");
  assert.equal(polish.parsed.canPrefill, true);
  assert.deepEqual(polish.parsed.values, {
    energyKj100: "900",
    energyKcal100: "215",
    fat100: "8",
    carbohydrates100: "20",
    protein100: "6",
  });
  assert.ok(
    polish.parsed.issues.some(
      (issue) => issue.kind === "low-confidence" && issue.field === "salt100",
    ),
  );

  console.log(
    JSON.stringify({ elapsedMs: Math.round(performance.now() - startedAt), observations }, null, 2),
  );
} finally {
  await worker.terminate();
}
