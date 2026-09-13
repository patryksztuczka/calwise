import { describe, expect, it } from "vite-plus/test";
import {
  parseNutritionLabel,
  type NutritionOcrLine,
  type NutritionOcrWord,
} from "../nutrition-label-parser";

function lineAt(
  top: number,
  ...entries: readonly (readonly [text: string, x: number, confidence?: number])[]
): NutritionOcrLine {
  return {
    words: entries.map(([text, x, confidence]): NutritionOcrWord => {
      const word: NutritionOcrWord = {
        text,
        left: x,
        top,
        right: x + 35,
        bottom: top + 16,
      };
      return confidence === undefined ? word : { ...word, confidence };
    }),
  };
}

function line(
  ...entries: readonly (readonly [text: string, x: number, confidence?: number])[]
): NutritionOcrLine {
  return lineAt(0, ...entries);
}

function transformLines(
  lines: readonly NutritionOcrLine[],
  scale: number,
  offsetX: number,
): readonly NutritionOcrLine[] {
  return lines.map(({ words }) => ({
    words: words.map((word) => ({
      ...word,
      left: word.left * scale + offsetX,
      right: word.right * scale + offsetX,
      top: word.top * scale,
      bottom: word.bottom * scale,
    })),
  }));
}

const qualifiedProteinRows = [
  [
    "English less than",
    line(["Protein", 10], ["less", 440], ["than", 485], ["0.5", 540], ["g", 585]),
  ],
  [
    "English more than",
    line(["Protein", 10], ["more", 440], ["than", 485], ["0.5", 540], ["g", 585]),
  ],
  [
    "English at least",
    line(["Protein", 10], ["at", 455], ["least", 490], ["0.5", 540], ["g", 585]),
  ],
  ["English at most", line(["Protein", 10], ["at", 455], ["most", 490], ["0.5", 540], ["g", 585])],
  [
    "English approximately",
    line(["Protein", 10], ["approximately", 430], ["0.5", 540], ["g", 585]),
  ],
  ["English about", line(["Protein", 10], ["about", 480], ["0.5", 540], ["g", 585])],
  [
    "English trailing abbreviation",
    line(["Protein", 10], ["0.5", 540], ["g", 585], ["approx.", 630]),
  ],
  [
    "English punctuation split",
    line(["Protein", 10], ["less,", 430], ["-", 470], ["than", 495], ["0.5", 540], ["g", 585]),
  ],
  [
    "Polish mniej niż",
    line(["Białko", 10], ["mniej", 440], ["niż", 490], ["0,5", 540], ["g", 585]),
  ],
  [
    "Polish więcej niż",
    line(["Białko", 10], ["więcej", 440], ["niż", 490], ["0,5", 540], ["g", 585]),
  ],
  [
    "Polish co najmniej",
    line(["Białko", 10], ["co", 420], ["najmniej", 465], ["0,5", 540], ["g", 585]),
  ],
  [
    "Polish co najwyżej",
    line(["Białko", 10], ["co", 420], ["najwyżej", 465], ["0,5", 540], ["g", 585]),
  ],
  ["Polish około", line(["Białko", 10], ["około", 480], ["0,5", 540], ["g", 585])],
  [
    "Polish w przybliżeniu",
    line(["Białko", 10], ["w", 420], ["przybliżeniu", 455], ["0,5", 540], ["g", 585]),
  ],
  ["Polish trailing", line(["Białko", 10], ["0,5", 540], ["g", 585], ["około", 630])],
  [
    "split greater-than symbol",
    line(["Protein", 10], [">", 480], ["=", 515], ["0.5", 550], ["g", 595]),
  ],
  [
    "low-confidence qualifier",
    line(["Protein", 10], ["about", 480, 12], ["0.5", 540, 96], ["g", 585, 96]),
  ],
] as const;

const unsupportedValueAreaRows = [
  ["under before protein", "protein100", line(["Protein", 10], ["under", 470], ["0.5g", 540])],
  ["over before fat", "fat100", line(["Fat", 10], ["over", 480], ["2", 540], ["g", 585])],
  ["roughly after salt", "salt100", line(["Salt", 10], ["0.2", 540], ["g", 585], ["roughly", 630])],
  [
    "estimated before carbohydrate",
    "carbohydrates100",
    line(["Carbohydrate", 10], ["estimated", 450], ["4g", 540]),
  ],
  ["ca. before Polish protein", "protein100", line(["Białko", 10], ["ca.", 490], ["0,5g", 540])],
  [
    "unfamiliar word before protein",
    "protein100",
    line(["Protein", 10], ["tentative", 450], ["0.5g", 540]),
  ],
  ["unfamiliar word after fat", "fat100", line(["Fat", 10], ["2g", 540], ["provisional", 600])],
  ["misspelled modifier", "protein100", line(["Protein", 10], ["aprox", 470], ["0.5g", 540])],
  ["unjustified parentheses", "protein100", line(["Protein", 10], ["(0.5g)", 540])],
  [
    "split modifier",
    "protein100",
    line(["Protein", 10], ["rough", 450], ["ly", 495], ["0.5g", 540]),
  ],
  [
    "Polish unfamiliar annotation",
    "salt100",
    line(["Sól", 10], ["0,2g", 540], ["szacunkowo", 600]),
  ],
  [
    "reference intake tail",
    "fat100",
    line(["Fat", 10], ["8g", 540], ["10", 600], ["%", 640], ["RI", 675]),
  ],
  [
    "unfamiliar serving-cell annotation",
    "protein100",
    line(["Protein", 10], ["daily", 230], ["0.2", 280], ["g", 325], ["7", 540], ["g", 585]),
  ],
] as const;

describe("parseNutritionLabel", () => {
  it("uses the explicit per-100 g column instead of the serving column", () => {
    const result = parseNutritionLabel([
      line(["Per", 250], ["serving", 290], ["Per", 520], ["100", 560], ["g", 605]),
      line(
        ["Energy", 10],
        ["210", 250],
        ["kJ", 290],
        ["50", 335],
        ["kcal", 375],
        ["840", 535],
        ["kJ", 580],
        ["200", 625],
        ["kcal", 670],
      ),
      line(["Fat", 10], ["2.5", 265], ["g", 305], ["10", 570], ["g", 610]),
      line(
        ["of", 35],
        ["which", 70],
        ["saturates", 120],
        ["0.5", 265],
        ["g", 305],
        ["2", 570],
        ["g", 610],
      ),
      line(["Carbohydrate", 10], ["5", 265], ["g", 305], ["20", 570], ["g", 610]),
      line(
        ["of", 35],
        ["which", 70],
        ["sugars", 120],
        ["1", 265],
        ["g", 305],
        ["4", 570],
        ["g", 610],
      ),
      line(["Protein", 10], ["1.5", 265], ["g", 305], ["6", 570], ["g", 610]),
      line(["Salt", 10], ["0.2", 265], ["g", 305], ["0.8", 570], ["g", 610]),
    ]);

    expect(result).toEqual({
      basis: "g",
      canPrefill: true,
      issues: [],
      values: {
        energyKj100: "840",
        energyKcal100: "200",
        fat100: "10",
        saturatedFat100: "2",
        carbohydrates100: "20",
        sugars100: "4",
        protein100: "6",
        salt100: "0.8",
      },
    });
  });

  it("recognizes Polish labels, decimal commas, millilitres, and literal zero", () => {
    const result = parseNutritionLabel([
      line(["Wartość", 10], ["odżywcza", 80], ["w", 420], ["100", 450], ["ml", 500]),
      line(["Energia", 10], ["168", 445], ["kJ", 490], ["40", 535], ["kcal", 575]),
      line(["Tłuszcz", 10], ["0", 455], ["g", 500]),
      line(["Węglowodany", 10], ["9,5", 455], ["g", 500]),
      line(["w", 30], ["tym", 55], ["cukry", 95], ["9,5", 455], ["g", 500]),
      line(["Białko", 10], ["0,4", 455], ["g", 500]),
      line(["Sól", 10], ["0,03", 455], ["g", 500]),
    ]);

    expect(result.basis).toBe("ml");
    expect(result.canPrefill).toBe(true);
    expect(result.values).toMatchObject({
      energyKj100: "168",
      energyKcal100: "40",
      fat100: "0",
      carbohydrates100: "9.5",
      sugars100: "9.5",
      protein100: "0.4",
      salt100: "0.03",
    });
  });

  it("leaves qualified values blank instead of turning them into exact values", () => {
    const result = parseNutritionLabel([
      line(["Per", 400], ["100", 440], ["g", 485]),
      line(["Fat", 10], ["<", 420], ["0.5", 445], ["g", 490]),
      line(["Protein", 10], ["7", 445], ["g", 490]),
    ]);

    expect(result.canPrefill).toBe(true);
    expect(result.values).toEqual({ protein100: "7" });
    expect(result.issues).toEqual([
      {
        kind: "qualified-value",
        field: "fat100",
        message: 'Fat is printed as "< 0.5 g" and was left blank.',
      },
    ]);
  });

  it("blocks prefill when the basis is missing or contradictory", () => {
    const missing = parseNutritionLabel([line(["Protein", 10], ["7", 445], ["g", 490])]);
    expect(missing.canPrefill).toBe(false);
    expect(missing.issues[0]?.kind).toBe("missing-basis");

    const contradictory = parseNutritionLabel([
      line(["Per", 300], ["100", 340], ["g", 380]),
      line(["Per", 500], ["100", 540], ["ml", 590]),
      line(["Protein", 10], ["7", 345], ["g", 390]),
    ]);
    expect(contradictory.canPrefill).toBe(false);
    expect(contradictory.issues[0]?.kind).toBe("ambiguous-basis");
  });

  it("requires nutrient values to align with the explicit per-100 column", () => {
    const metadataIsNotAColumn = parseNutritionLabel([
      lineAt(20, ["Serving", 10], ["size", 80], ["30", 150], ["g", 190]),
      lineAt(100, ["Per", 500], ["100", 540], ["g", 585]),
      lineAt(150, ["Protein", 10], ["2", 280], ["g", 320]),
    ]);
    expect(metadataIsNotAColumn.canPrefill).toBe(false);
    expect(metadataIsNotAColumn.values).not.toHaveProperty("protein100");
    expect(metadataIsNotAColumn.issues.some((issue) => issue.kind === "ambiguous-columns")).toBe(
      true,
    );

    const validSingleColumn = parseNutritionLabel([
      line(["Per", 500], ["100", 540], ["g", 585]),
      line(["Protein", 10], ["7", 540], ["g", 585]),
    ]);
    expect(validSingleColumn.canPrefill).toBe(true);
    expect(validSingleColumn.values.protein100).toBe("7");
  });

  it("does not infer a missing serving-column heading", () => {
    const result = parseNutritionLabel([
      line(["Per", 500], ["100", 540], ["g", 585]),
      line(["Protein", 10], ["2", 280], ["g", 320], ["7", 540], ["g", 585]),
    ]);
    expect(result.canPrefill).toBe(false);
    expect(result.values).toEqual({});
    expect(result.issues.some((issue) => issue.kind === "ambiguous-columns")).toBe(true);
  });

  it("blocks low-confidence basis, number, and unit tokens", () => {
    const lowBasis = parseNutritionLabel([
      line(["Per", 500, 95], ["100", 540, 36], ["g", 585, 95]),
      line(["Protein", 10, 95], ["7", 540, 95], ["g", 585, 95]),
    ]);
    expect(lowBasis.canPrefill).toBe(false);
    expect(lowBasis.issues.some((issue) => issue.kind === "low-confidence")).toBe(true);

    for (const row of [
      line(["Protein", 10, 95], ["7", 540, 36], ["g", 585, 95]),
      line(["Protein", 10, 95], ["7", 540, 95], ["g", 585, 36]),
    ]) {
      const result = parseNutritionLabel([
        line(["Per", 500, 95], ["100", 540, 95], ["g", 585, 95]),
        row,
      ]);
      expect(result.canPrefill).toBe(false);
      expect(result.values).toEqual({});
      expect(result.issues.some((issue) => issue.kind === "low-confidence")).toBe(true);
    }
  });

  it("rejects attached and symbolic approximate values without blocking unrelated rows", () => {
    const qualifiedRows = [
      line(["Fat", 10], [">=0.5g", 540]),
      line(["Fat", 10], ["≥", 510], ["0.5g", 550]),
      line(["Fat", 10], ["~0.5g", 540]),
      line(["Fat", 10], ["≈", 510], ["0.5", 550], ["g", 590]),
      line(["Fat", 10], ["trace", 540]),
    ];
    for (const row of qualifiedRows) {
      const result = parseNutritionLabel([
        line(["Per", 500], ["100", 540], ["g", 585]),
        row,
        line(["Protein", 10], ["7", 540], ["g", 585]),
      ]);
      expect(result.values).not.toHaveProperty("fat100");
      expect(result.values.protein100).toBe("7");
      expect(
        result.issues.some((issue) => issue.kind === "qualified-value" && issue.field === "fat100"),
      ).toBe(true);
    }
  });

  it.each(qualifiedProteinRows)("rejects a qualified nutrient row: %s", (_name, row) => {
    const result = parseNutritionLabel([
      line(["Per", 500], ["100", 540], ["g", 585]),
      row,
      line(["Fat", 10], ["8", 540], ["g", 585]),
    ]);
    expect(result.values).not.toHaveProperty("protein100");
    expect(result.values.fat100).toBe("8");
    expect(
      result.issues.some(
        (issue) => issue.kind === "qualified-value" && issue.field === "protein100",
      ),
    ).toBe(true);
  });

  it.each(unsupportedValueAreaRows)(
    "rejects unaccounted value-area syntax: %s",
    (_name, field, row) => {
      const result = parseNutritionLabel([
        line(["Per", 280], ["serving", 320], ["Per", 500], ["100", 540], ["g", 585]),
        row,
        line(["Fibre", 10], ["3", 540], ["g", 585]),
      ]);
      expect(result.values).not.toHaveProperty(field);
      expect(result.values.fiber100).toBe("3");
      expect(
        result.issues.some((issue) => issue.field === field && issue.kind === "unsupported-row"),
      ).toBe(true);
    },
  );

  it("allows only justified label and table punctuation", () => {
    const result = parseNutritionLabel([
      line(["Per", 280], ["serving", 320], ["Per", 500], ["100", 540], ["g", 585]),
      line(["Protein:", 10], ["0.2g", 280], ["|", 500], ["7g", 540]),
    ]);
    expect(result.values.protein100).toBe("7");
    expect(result.issues).toEqual([]);
  });

  it("keeps supported multiword nutrient labels and exact value cells", () => {
    const english = parseNutritionLabel([
      line(["Per", 500], ["100", 540], ["g", 585]),
      line(["of", 10], ["which", 50], ["saturated", 100], ["fat", 150], ["2g", 540]),
    ]);
    expect(english.values.saturatedFat100).toBe("2");
    expect(english.issues).toEqual([]);

    const polish = parseNutritionLabel([
      line(["w", 500], ["100", 540], ["g", 585]),
      line(
        ["w", 10],
        ["tym", 45],
        ["kwasy", 80],
        ["tłuszczowe", 125],
        ["nasycone", 190],
        ["2g", 540],
      ),
    ]);
    expect(polish.values.saturatedFat100).toBe("2");
    expect(polish.issues).toEqual([]);
  });

  it("abstains from the whole nutrient row when a serving cell is qualified", () => {
    const result = parseNutritionLabel([
      line(["Per", 280], ["serving", 320], ["Per", 500], ["100", 540], ["g", 585]),
      line(
        ["Protein", 10],
        ["less", 250],
        ["than", 295],
        ["0.5", 340],
        ["g", 385],
        ["7", 540],
        ["g", 585],
      ),
    ]);
    expect(result.canPrefill).toBe(false);
    expect(result.values).not.toHaveProperty("protein100");
    expect(result.issues.some((issue) => issue.kind === "qualified-value")).toBe(true);
  });

  it("rejects prepared per-100 columns in English and Polish", () => {
    for (const header of [
      line(["Per", 480], ["100", 520], ["g", 565], ["as", 610], ["prepared", 650]),
      line(["w", 480], ["100", 520], ["g", 565], ["po", 610], ["przygotowaniu", 650]),
    ]) {
      const result = parseNutritionLabel([header, line(["Protein", 10], ["7", 520], ["g", 565])]);
      expect(result.canPrefill).toBe(false);
      expect(result.values).toEqual({});
      expect(result.issues.some((issue) => issue.kind === "prepared-basis")).toBe(true);
    }
  });

  it.each([
    [
      "English above",
      [
        lineAt(60, ["as", 500], ["prepared", 540]),
        lineAt(100, ["Per", 500], ["100", 540], ["g", 585]),
      ],
    ],
    [
      "English below",
      [
        lineAt(100, ["Per", 500], ["100", 540], ["g", 585]),
        lineAt(125, ["as", 500], ["prepared", 540]),
      ],
    ],
    [
      "English wrapped",
      [
        lineAt(60, ["as", 520]),
        lineAt(80, ["prepared", 520]),
        lineAt(100, ["Per", 500], ["100", 540], ["g", 585]),
      ],
    ],
    [
      "Polish above",
      [
        lineAt(60, ["po", 500], ["przygotowaniu", 540]),
        lineAt(100, ["w", 500], ["100", 540], ["g", 585]),
      ],
    ],
    [
      "Polish below",
      [
        lineAt(100, ["w", 500], ["100", 540], ["g", 585]),
        lineAt(125, ["po", 500], ["przygotowaniu", 540]),
      ],
    ],
    [
      "Polish wrapped",
      [
        lineAt(60, ["po", 520]),
        lineAt(80, ["przygotowaniu", 520]),
        lineAt(100, ["w", 500], ["100", 540], ["g", 585]),
      ],
    ],
  ] as const)("rejects multiline prepared context: %s", (_name, headerLines) => {
    const result = parseNutritionLabel([
      ...headerLines,
      lineAt(160, ["Protein", 10], ["7", 540], ["g", 585]),
    ]);
    expect(result.canPrefill).toBe(false);
    expect(result.values).toEqual({});
    expect(result.issues.some((issue) => issue.kind === "prepared-basis")).toBe(true);
  });

  it("requires direct column evidence instead of a page-relative distance", () => {
    const nearbyServingValue = [
      line(["Per", 500], ["100", 540], ["g", 585]),
      line(["Protein", 10], ["2", 450], ["g", 490]),
    ];
    for (const [scale, offset] of [
      [1, 0],
      [0.5, 200],
      [2, 100],
    ] as const) {
      const result = parseNutritionLabel(transformLines(nearbyServingValue, scale, offset));
      expect(result.canPrefill).toBe(false);
      expect(result.values).toEqual({});
      expect(result.issues.some((issue) => issue.kind === "ambiguous-columns")).toBe(true);
    }
  });

  it("handles narrow columns conservatively while keeping direct single-column values", () => {
    const narrowColumns = parseNutritionLabel([
      line(["Serving", 440], ["Per", 500], ["100", 540], ["g", 585]),
      line(["Protein", 10], ["2", 475], ["g", 515], ["7", 540], ["g", 585]),
    ]);
    expect(narrowColumns.values.protein100).toBe("7");

    const missingServingHeading = parseNutritionLabel([
      line(["Per", 500], ["100", 540], ["g", 585]),
      line(["Protein", 10], ["2", 475], ["g", 515], ["7", 540], ["g", 585]),
    ]);
    expect(missingServingHeading.canPrefill).toBe(false);
    expect(missingServingHeading.values).toEqual({});

    const missingTargetCell = parseNutritionLabel([
      line(["Serving", 440], ["Per", 500], ["100", 540], ["g", 585]),
      line(["Protein", 10], ["2", 475], ["g", 515]),
    ]);
    expect(missingTargetCell.canPrefill).toBe(false);
    expect(missingTargetCell.values).not.toHaveProperty("protein100");

    const validSingleColumn = [
      line(["Per", 500], ["100", 540], ["g", 585]),
      line(["Protein", 10], ["7", 540], ["g", 585]),
    ];
    for (const [scale, offset] of [
      [0.5, 200],
      [1, 0],
      [2, 100],
    ] as const) {
      expect(
        parseNutritionLabel(transformLines(validSingleColumn, scale, offset)).values.protein100,
      ).toBe("7");
    }
  });

  it("blocks prefill when several unlabelled columns or conflicting rows remain", () => {
    const columns = parseNutritionLabel([
      line(["Per", 500], ["100", 540], ["g", 585]),
      line(["Protein", 10], ["5", 300], ["g", 340], ["7", 540], ["g", 585]),
    ]);
    expect(columns.canPrefill).toBe(false);
    expect(columns.issues.some((issue) => issue.kind === "ambiguous-columns")).toBe(true);

    const conflict = parseNutritionLabel([
      line(["Per", 500], ["100", 540], ["g", 585]),
      line(["Protein", 10], ["5", 540], ["g", 585]),
      line(["Protein", 10], ["7", 540], ["g", 585]),
    ]);
    expect(conflict.canPrefill).toBe(false);
    expect(conflict.values).not.toHaveProperty("protein100");
    expect(conflict.issues.some((issue) => issue.kind === "conflicting-values")).toBe(true);
  });

  it("does not derive calories, salt, or sodium", () => {
    const result = parseNutritionLabel([
      line(["Per", 400], ["100", 440], ["g", 485]),
      line(["Energy", 10], ["840", 440], ["kJ", 485]),
      line(["Sodium", 10], ["0.2", 440], ["g", 485]),
    ]);

    expect(result.values).toEqual({ energyKj100: "840", sodium100: "0.2" });
    expect(result.values).not.toHaveProperty("energyKcal100");
    expect(result.values).not.toHaveProperty("salt100");
  });
});
