const LOCALE = "en-US";

export const numberFormat = new Intl.NumberFormat(LOCALE);
export const nutritionFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });
