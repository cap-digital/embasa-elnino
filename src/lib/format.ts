/** Formatação pt-BR centralizada (R$, ponto de milhar, vírgula decimal). */

const LOCALE = "pt-BR";

const intFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const compactFormatter = new Intl.NumberFormat(LOCALE, {
  notation: "compact",
  maximumFractionDigits: 1,
});
const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const currencyIntFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const formatInt = (value: number) => intFormatter.format(Math.round(value));

export const formatCompact = (value: number) => compactFormatter.format(value);

/** R$ 30.000,00 */
export const formatCurrency = (value: number) => currencyFormatter.format(value);

/** R$ 30.000 */
export const formatCurrencyInt = (value: number) =>
  currencyIntFormatter.format(value);

/** R$ 12,5 mil — para eixos e rótulos curtos. */
export function formatCurrencyCompact(value: number) {
  if (Math.abs(value) >= 1000) {
    return `R$ ${compactFormatter.format(value)}`;
  }
  return currencyIntFormatter.format(value);
}

export function formatDecimal(value: number, digits = 2) {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** 0.118 → "11,8%" */
export function formatPercent(fraction: number, digits = 1) {
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(fraction);
}

/** 1.18 → "118%" (inteiro, para barras de progresso). */
export const formatProgress = (fraction: number) =>
  formatPercent(fraction, 0);

/** +4,2 pp / −3,1 pp */
export function formatDeltaPp(fraction: number) {
  const pp = fraction * 100;
  const sign = pp > 0 ? "+" : pp < 0 ? "−" : "";
  return `${sign}${formatDecimal(Math.abs(pp), 1)} pp`;
}

export function parseIsoDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`);
}

/** 24/09/2026 */
export function formatDate(iso: string | Date) {
  const date = typeof iso === "string" ? parseIsoDate(iso) : iso;
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** 24 de setembro de 2026 */
export function formatDateLong(iso: string | Date) {
  const date = typeof iso === "string" ? parseIsoDate(iso) : iso;
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** 24 set */
export function formatDateShort(iso: string | Date) {
  const date = typeof iso === "string" ? parseIsoDate(iso) : iso;
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(date)
    .replace(".", "");
}

/** Data/hora ISO → "24/09" no fuso da Bahia (datas de veiculação das APIs). */
export function formatDayMonthBahia(iso: string) {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Bahia",
  }).format(new Date(iso));
}

/** Custo unitário: R$ com 2 casas; 3 casas abaixo de R$ 0,10 (R$ 0,017). */
export function formatUnitCost(value: number) {
  if (value > 0 && value < 0.1) {
    return new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(value);
  }
  return formatCurrency(value);
}
