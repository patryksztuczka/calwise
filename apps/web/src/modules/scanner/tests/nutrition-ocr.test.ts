import { describe, expect, it } from "vite-plus/test";
import { nutritionLinesFromTsv } from "../nutrition-ocr";

const header =
  "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext";

describe("nutritionLinesFromTsv", () => {
  it("keeps Tesseract word positions and line grouping", () => {
    const lines = nutritionLinesFromTsv(
      [
        header,
        "5\t1\t1\t1\t1\t1\t20\t10\t50\t20\t96\tProtein",
        "5\t1\t1\t1\t1\t2\t300\t10\t20\t20\t91\t7",
        "5\t1\t1\t1\t1\t3\t330\t10\t10\t20\t90\tg",
        "5\t1\t1\t1\t2\t1\t20\t40\t30\t20\t89\tSalt",
        "5\t1\t1\t1\t2\t2\t300\t40\t15\t20\t12\t≈",
      ].join("\n"),
    );

    expect(lines).toEqual([
      {
        words: [
          { text: "Protein", left: 20, top: 10, right: 70, bottom: 30, confidence: 96 },
          { text: "7", left: 300, top: 10, right: 320, bottom: 30, confidence: 91 },
          { text: "g", left: 330, top: 10, right: 340, bottom: 30, confidence: 90 },
        ],
      },
      {
        words: [
          { text: "Salt", left: 20, top: 40, right: 50, bottom: 60, confidence: 89 },
          { text: "≈", left: 300, top: 40, right: 315, bottom: 60, confidence: 12 },
        ],
      },
    ]);
  });
});
