import type {
  NutritionBasisUnit,
  PersonalProductNutrientKey,
} from "@calwise/food-rules/personal-product";

export const MIN_CRITICAL_OCR_CONFIDENCE = 70;

export interface NutritionOcrWord {
  readonly text: string;
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly confidence?: number;
}

export interface NutritionOcrLine {
  readonly words: readonly NutritionOcrWord[];
}

export type NutritionParseIssueKind =
  | "missing-basis"
  | "ambiguous-basis"
  | "prepared-basis"
  | "ambiguous-columns"
  | "conflicting-values"
  | "low-confidence"
  | "qualified-value"
  | "unsupported-row"
  | "no-nutrients";

export interface NutritionParseIssue {
  readonly kind: NutritionParseIssueKind;
  readonly field?: PersonalProductNutrientKey;
  readonly message: string;
}

export interface ParsedNutritionLabel {
  readonly basis?: NutritionBasisUnit;
  readonly values: Readonly<Partial<Record<PersonalProductNutrientKey, string>>>;
  readonly issues: readonly NutritionParseIssue[];
  readonly canPrefill: boolean;
}

interface Header {
  readonly basis: NutritionBasisUnit;
  readonly left: number;
  readonly right: number;
  readonly x: number;
  readonly top: number;
  readonly bottom: number;
  readonly trusted: boolean;
  readonly prepared: boolean;
}

interface Candidate {
  readonly value: string;
  readonly unit: "g" | "mg" | "kj" | "kcal";
  readonly left: number;
  readonly right: number;
  readonly x: number;
  readonly printed: string;
  readonly qualified: boolean;
  readonly trusted: boolean;
}

const fieldLabels: Record<PersonalProductNutrientKey, string> = {
  energyKcal100: "Calories",
  energyKj100: "Energy",
  protein100: "Protein",
  carbohydrates100: "Carbohydrates",
  fat100: "Fat",
  saturatedFat100: "Saturated fat",
  sugars100: "Sugars",
  fiber100: "Fibre",
  salt100: "Salt",
  sodium100: "Sodium",
};

function folded(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[łŁ]/g, "l")
    .toLowerCase()
    .replace(/[|()[\]{}:;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function center(word: NutritionOcrWord) {
  return (word.left + word.right) / 2;
}

function trusted(word: NutritionOcrWord | undefined) {
  return (
    word !== undefined &&
    (word.confidence === undefined || word.confidence >= MIN_CRITICAL_OCR_CONFIDENCE)
  );
}

function nutritionBasis(value: string | undefined): NutritionBasisUnit | undefined {
  return value === "g" || value === "ml" ? value : undefined;
}

function nutritionUnit(value: string | undefined): Candidate["unit"] | undefined {
  return value === "g" || value === "mg" || value === "kj" || value === "kcal" ? value : undefined;
}

function nutritionHeader(line: NutritionOcrLine): Header | undefined {
  const words = line.words.map((word) => folded(word.text));
  for (let index = 0; index < words.length; index += 1) {
    const combined = words[index]?.match(/^100\s*(g|ml)$/);
    const next = words[index + 1]?.match(/^(g|ml)$/);
    const basis = nutritionBasis(combined?.[1] ?? (words[index] === "100" ? next?.[1] : undefined));
    if (!basis) continue;
    const prefixStart = Math.max(0, index - 4);
    const indicatorOffset = words
      .slice(prefixStart, index)
      .findLastIndex((word) => word === "per" || word === "w");
    if (indicatorOffset < 0) continue;
    const indicatorIndex = prefixStart + indicatorOffset;
    const amountWord = line.words[index];
    const unitWord = combined ? amountWord : line.words[index + 1];
    if (!amountWord || !unitWord) continue;
    const text = folded(line.words.map((word) => word.text).join(" "));
    return {
      basis,
      left: amountWord.left,
      right: unitWord.right,
      x: (center(amountWord) + center(unitWord)) / 2,
      top: Math.min(...line.words.map((word) => word.top)),
      bottom: Math.max(...line.words.map((word) => word.bottom)),
      trusted: trusted(line.words[indicatorIndex]) && trusted(amountWord) && trusted(unitWord),
      prepared: /\b(?:as )?prepared\b|przygotowan|po przygotowaniu/.test(text),
    };
  }
  return undefined;
}

function servingHeaderX(lines: readonly NutritionOcrLine[], headers: readonly Header[]) {
  const matches = lines.flatMap((line) =>
    line.words.filter((word) => {
      if (!/^(?:per )?serv|portion|porcj/.test(folded(word.text))) return false;
      const wordY = (word.top + word.bottom) / 2;
      return headers.some((header) => {
        const headerY = (header.top + header.bottom) / 2;
        const tolerance = Math.max(20, (header.bottom - header.top) * 1.5);
        return center(word) < header.x && Math.abs(wordY - headerY) <= tolerance;
      });
    }),
  );
  return matches.length > 0
    ? matches.reduce((sum, word) => sum + center(word), 0) / matches.length
    : undefined;
}

type NutritionRowKind = PersonalProductNutrientKey | "energy";

function rowKind(text: string): NutritionRowKind | undefined {
  if (/saturat|nasycon/.test(text)) return "saturatedFat100";
  if (/sugars?|cukr/.test(text)) return "sugars100";
  if (/carbohyd|weglowodan/.test(text)) return "carbohydrates100";
  if (/(?:^| )fat(?: |$)|tluszcz/.test(text)) return "fat100";
  if (/fib(?:er|re)|blonnik/.test(text)) return "fiber100";
  if (/protein|bialko/.test(text)) return "protein100";
  if (/sodium|(?:^| )sod(?: |$)/.test(text)) return "sodium100";
  if (/salt|(?:^| )sol(?: |$)/.test(text)) return "salt100";
  if (/energy|energia|energetycz/.test(text)) return "energy";
  return undefined;
}

const rowLabelPatterns: Record<NutritionRowKind, readonly (readonly string[])[]> = {
  energy: [["energy"], ["energy", "value"], ["energia"], ["wartosc", "energetyczna"]],
  energyKcal100: [],
  energyKj100: [],
  protein100: [["protein"], ["bialko"]],
  carbohydrates100: [
    ["carbohydrate"],
    ["carbohydrates"],
    ["total", "carbohydrate"],
    ["total", "carbohydrates"],
    ["weglowodany"],
  ],
  fat100: [["fat"], ["total", "fat"], ["tluszcz"]],
  saturatedFat100: [
    ["saturates"],
    ["saturated", "fat"],
    ["of", "which", "saturates"],
    ["of", "which", "saturated", "fat"],
    ["nasycone"],
    ["tluszcze", "nasycone"],
    ["w", "tym", "tluszcze", "nasycone"],
    ["kwasy", "tluszczowe", "nasycone"],
    ["w", "tym", "kwasy", "tluszczowe", "nasycone"],
  ],
  sugars100: [
    ["sugar"],
    ["sugars"],
    ["of", "which", "sugar"],
    ["of", "which", "sugars"],
    ["cukry"],
    ["w", "tym", "cukry"],
  ],
  fiber100: [["fiber"], ["fibre"], ["blonnik"]],
  salt100: [["salt"], ["sol"]],
  sodium100: [["sodium"], ["sod"]],
};

function labelLength(line: NutritionOcrLine, kind: NutritionRowKind) {
  const words = line.words.map((word) => folded(word.text));
  return rowLabelPatterns[kind]
    .toSorted((left, right) => right.length - left.length)
    .find((pattern) => pattern.every((token, index) => words[index] === token))?.length;
}

function supportedUnits(kind: NutritionRowKind) {
  return kind === "energy" ? new Set(["kj", "kcal"]) : new Set(["g"]);
}

function valueSyntaxToken(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[łŁ]/g, "l")
    .toLowerCase()
    .trim();
}

/** Every token after the nutrient label must belong to an exact value-cell grammar. */
function hasSupportedValueAreaSyntax(line: NutritionOcrLine, kind: NutritionRowKind) {
  const labelWords = labelLength(line, kind);
  if (labelWords === undefined) return false;
  const units = supportedUnits(kind);
  let index = labelWords;
  let values = 0;
  let previousWasValue = false;

  const punctuation = line.words[index];
  if (punctuation && /^:$/.test(punctuation.text.trim())) index += 1;
  while (index < line.words.length) {
    const word = line.words[index];
    if (!word) return false;
    const raw = valueSyntaxToken(word.text);
    if (/^[|]$/.test(word.text.trim())) {
      index += 1;
      continue;
    }
    if (/^[/\\]$/.test(raw)) {
      if (kind !== "energy" || !previousWasValue) return false;
      previousWasValue = false;
      index += 1;
      continue;
    }

    const numeric = raw.match(/^(\d+(?:[.,]\d+)?)(g|mg|kj|kcal)?$/);
    if (!numeric) return false;
    let unit = numeric[2];
    if (!unit) {
      const unitWord = line.words[index + 1];
      unit = unitWord ? valueSyntaxToken(unitWord.text) : undefined;
      if (!unit || !/^(?:g|mg|kj|kcal)$/.test(unit)) return false;
      index += 1;
    }
    if (!units.has(unit)) return false;
    values += 1;
    previousWasValue = true;
    index += 1;
  }
  return values > 0 && previousWasValue;
}

function cleanToken(text: string) {
  return folded(text)
    .replace(/^[/\\]+|[/\\.,]+$/g, "")
    .replace(/\s/g, "");
}

function qualifierBefore(line: NutritionOcrLine, numericIndex: number) {
  const preceding = line.words.slice(Math.max(0, numericIndex - 3), numericIndex);
  const tokens = preceding.map((word) => cleanToken(word.text));
  const symbols = tokens.join("");
  const words = tokens.join(" ");
  const qualified =
    /(?:[<>]=?|[≤≥~≈])/.test(symbols) ||
    /(?:^| )(?:about|approx(?:imately)?|around|circa|okolo|ponizej|mniej|trace|slad(?:owe)?)(?: |$)/.test(
      words,
    );
  const qualifierStart = tokens.findIndex((token) =>
    /^(?:[<>=~≤≥≈]|about|approx(?:imately)?|around|circa|okolo|ponizej|mniej|trace|slad(?:owe)?)$/.test(
      token,
    ),
  );
  return {
    qualified,
    printed:
      qualified && qualifierStart >= 0
        ? preceding
            .slice(qualifierStart)
            .map((word) => word.text)
            .join(" ")
        : "",
  };
}

function candidates(line: NutritionOcrLine): readonly Candidate[] {
  const found: Candidate[] = [];
  for (let index = 0; index < line.words.length; index += 1) {
    const numericIndex = index;
    const word = line.words[index];
    if (!word) continue;
    const token = cleanToken(word.text);
    const match = token.match(/^((?:[<>]=?)|[≤≥~≈])?(\d+(?:[.,]\d+)?)(g|mg|kj|kcal)?$/);
    if (!match) continue;
    let unit = nutritionUnit(match[3]);
    let right = word.right;
    let unitWord = word;
    let printed = word.text;
    if (!unit) {
      const possibleUnit = line.words[index + 1];
      const next = possibleUnit ? cleanToken(possibleUnit.text) : "";
      if (/^(g|mg|kj|kcal)$/.test(next)) {
        unit = nutritionUnit(next);
        unitWord = possibleUnit ?? word;
        right = unitWord.right;
        printed = `${printed} ${unitWord.text}`.trim();
        index += 1;
      }
    }
    if (!unit) continue;
    const preceding = qualifierBefore(line, numericIndex);
    const qualified = match[1] !== undefined || preceding.qualified;
    if (preceding.qualified) printed = `${preceding.printed} ${printed}`.trim();
    found.push({
      value: match[2]!.replace(",", "."),
      unit,
      left: word.left,
      right,
      x: (word.left + right) / 2,
      printed,
      qualified,
      trusted: trusted(word) && trusted(unitWord),
    });
  }
  return found;
}

function hasRowUncertainty(line: NutritionOcrLine) {
  const text = folded(line.words.map((word) => word.text).join(" "))
    .replace(/[.,!?_—–-]+/g, " ")
    .replace(/\s+/g, " ");
  const symbols = line.words.map((word) => cleanToken(word.text)).join("");
  return (
    /[<>≤≥~≈]/.test(symbols) ||
    /\b(?:less|more|greater)\s+than\b|\bat\s+(?:least|most)\b|\b(?:about|approx(?:imately)?|around|circa|trace|up to|maximum|minimum)\b|\b(?:mniej|wiecej)\s+niz\b|\bco\s+(?:najmniej|najwyzej)\b|\b(?:okolo|ponizej|powyzej|maksymalnie|minimalnie|slad(?:owe)?)\b|\bw\s+przyblizeniu\b/.test(
      text,
    )
  );
}

function hasPreparedContext(lines: readonly NutritionOcrLine[]) {
  const text = folded(lines.flatMap((line) => line.words.map((word) => word.text)).join(" "));
  return /\bprepared\b|\bafter preparation\b|\bpo przygotowaniu\b|\bprzygotowan\w*\b|\bpo przyrzadzeniu\b|\bprzyrzadzon\w*\b/.test(
    text,
  );
}

function horizontalGap(left: Candidate, right: Candidate) {
  if (left.right < right.left) return right.left - left.right;
  if (right.right < left.left) return left.left - right.right;
  return 0;
}

function sharesEnergyCell(
  value: Candidate,
  anchor: Candidate,
  line: NutritionOcrLine,
  maximumGap: number,
) {
  if (new Set([value.unit, anchor.unit]).size !== 2) return false;
  if (![value.unit, anchor.unit].every((unit) => unit === "kj" || unit === "kcal")) return false;
  if (horizontalGap(value, anchor) > maximumGap) return false;
  const left = value.x < anchor.x ? value : anchor;
  const right = value.x < anchor.x ? anchor : value;
  const hasPrintedSlash = line.words.some(
    (word) =>
      word.left >= left.right && word.right <= right.left && /^[/\\]$/.test(folded(word.text)),
  );
  if (hasPrintedSlash) return true;
  const rowHeight = Math.max(...line.words.map((word) => word.bottom - word.top));
  return horizontalGap(left, right) <= rowHeight;
}

function issueForQualified(
  field: PersonalProductNutrientKey,
  value?: Candidate,
): NutritionParseIssue {
  return {
    kind: "qualified-value",
    field,
    message: value
      ? `${fieldLabels[field]} is printed as "${value.printed}" and was left blank.`
      : `${fieldLabels[field]} has a qualified or approximate value and was left blank.`,
  };
}

/**
 * Parses exact values only when critical OCR tokens score at least 70 and the
 * value geometry matches an explicit, unprepared per-100 g/ml column.
 */
export function parseNutritionLabel(lines: readonly NutritionOcrLine[]): ParsedNutritionLabel {
  const issues: NutritionParseIssue[] = [];
  const headers = lines.flatMap((line) => {
    const header = nutritionHeader(line);
    return header ? [header] : [];
  });
  const basisUnits = [...new Set(headers.map((header) => header.basis))];
  if (headers.length === 0) {
    issues.push({
      kind: "missing-basis",
      message: "No explicit per 100 g or per 100 ml heading was found.",
    });
    return { values: {}, issues, canPrefill: false };
  }
  if (basisUnits.length !== 1) {
    issues.push({
      kind: "ambiguous-basis",
      message: "Both per 100 g and per 100 ml headings were found. Nothing was filled.",
    });
    return { values: {}, issues, canPrefill: false };
  }

  const basis = basisUnits[0]!;
  if (headers.some((header) => header.prepared) || hasPreparedContext(lines)) {
    issues.push({
      kind: "prepared-basis",
      message: "The per-100 column is marked as prepared. Nothing was filled.",
    });
    return { basis, values: {}, issues, canPrefill: false };
  }
  if (headers.some((header) => !header.trusted)) {
    issues.push({
      kind: "low-confidence",
      message: `The per 100 ${basis} heading contains OCR tokens below 70% confidence.`,
    });
    return { basis, values: {}, issues, canPrefill: false };
  }

  const matchingHeaders = headers.filter((header) => header.basis === basis);
  const targetLeft =
    matchingHeaders.reduce((sum, header) => sum + header.left, 0) / matchingHeaders.length;
  const targetRight =
    matchingHeaders.reduce((sum, header) => sum + header.right, 0) / matchingHeaders.length;
  const targetX = (targetLeft + targetRight) / 2;
  const targetWidth = targetRight - targetLeft;
  const servingX = servingHeaderX(lines, matchingHeaders);
  const found = new Map<PersonalProductNutrientKey, string[]>();
  let columnsAmbiguous = false;

  const onTargetSide = (value: Candidate) =>
    servingX === undefined || Math.abs(value.x - targetX) < Math.abs(value.x - servingX);
  const directlyUnderTarget = (value: Candidate) =>
    onTargetSide(value) &&
    ((value.x >= targetLeft && value.x <= targetRight) ||
      (targetX >= value.left && targetX <= value.right));

  const add = (
    field: PersonalProductNutrientKey,
    values: readonly Candidate[],
    rowCandidates: readonly Candidate[],
    row: NutritionOcrLine,
    energyRow: boolean,
  ) => {
    const qualified = values.filter((value) => value.qualified);
    for (const value of qualified) issues.push(issueForQualified(field, value));
    const exact = values.filter((value) => !value.qualified);
    if (exact.length === 0) return;

    const rowAnchors = rowCandidates.filter(
      (value) => !value.qualified && value.trusted && directlyUnderTarget(value),
    );
    const aligned = exact.filter(
      (value) =>
        directlyUnderTarget(value) ||
        (energyRow &&
          onTargetSide(value) &&
          rowAnchors.some((anchor) => sharesEnergyCell(value, anchor, row, targetWidth))),
    );
    if (servingX === undefined && exact.length > 1) {
      columnsAmbiguous = true;
      return;
    }
    if (aligned.length === 0 && servingX !== undefined) return;
    if (aligned.length !== 1) {
      columnsAmbiguous = true;
      return;
    }
    const selected = aligned[0]!;
    if (!selected.trusted) {
      issues.push({
        kind: "low-confidence",
        field,
        message: `${fieldLabels[field]} has a number or unit below 70% OCR confidence.`,
      });
      return;
    }
    found.set(field, [...(found.get(field) ?? []), selected.value]);
  };

  for (const line of lines) {
    const text = folded(line.words.map((word) => word.text).join(" "));
    const kind = rowKind(text);
    if (!kind) continue;
    const rowCandidates = candidates(line);
    const fields =
      kind === "energy"
        ? ([
            ["energyKj100", "kj"],
            ["energyKcal100", "kcal"],
          ] as const)
        : ([[kind, "g"]] as const);
    if (hasRowUncertainty(line)) {
      for (const [field, unit] of fields) {
        const evidence = rowCandidates.find((value) => value.unit === unit && value.qualified);
        issues.push(issueForQualified(field, evidence));
      }
      continue;
    }
    if (!hasSupportedValueAreaSyntax(line, kind)) {
      for (const [field] of fields) {
        issues.push({
          kind: "unsupported-row",
          field,
          message: `${fieldLabels[field]} contains unsupported text or value syntax and was left blank.`,
        });
      }
      continue;
    }
    for (const [field, unit] of fields) {
      const matching = rowCandidates.filter((value) => value.unit === unit);
      add(field, matching, rowCandidates, line, kind === "energy");
    }
  }

  if (columnsAmbiguous) {
    issues.push({
      kind: "ambiguous-columns",
      message:
        "A nutrient value could not be tied safely to the per-100 column. Nothing was filled.",
    });
  }

  const values: Partial<Record<PersonalProductNutrientKey, string>> = {};
  let hasConflict = false;
  for (const [field, readings] of found) {
    const unique = [...new Set(readings)];
    if (unique.length === 1) values[field] = unique[0]!;
    else {
      hasConflict = true;
      issues.push({
        kind: "conflicting-values",
        field,
        message: `Conflicting ${fieldLabels[field].toLowerCase()} values were found. Nothing was filled.`,
      });
    }
  }

  const blocking = columnsAmbiguous || hasConflict;
  if (!blocking && Object.keys(values).length === 0) {
    issues.push({
      kind: "no-nutrients",
      message: "No supported per-100 nutrient values were read.",
    });
  }
  return {
    basis,
    values: blocking ? {} : values,
    issues,
    canPrefill: !blocking && Object.keys(values).length > 0,
  };
}
