import type { LineId } from "./types";

/**
 * TABELA DE MARGENS POR PLATAFORMA
 * ---------------------------------------------------------------
 * Regra: investimento exibido = gasto da plataforma ÷ margem.
 * O valor resultante é o usado em todo o dashboard (investido,
 * barras, totais e custos unitários como CPM, CPV, CPC e CPE).
 *
 * Para alterar a margem de uma plataforma, edite só a linha dela.
 * Use fração decimal: 0.20 = 20%.
 *
 * `spendIncludesMargin: true` = a fonte já entrega o valor final com a margem
 * embutida (ex.: Rich Media e WhatsApp na planilha); nesse caso o valor é usado como está.
 */
export const PLATFORM_MARGINS: Record<
  LineId,
  { label: string; margin: number; spendIncludesMargin?: boolean }
> = {
  "video-hawk": { label: "REDE DE VIDEO - HAWK", margin: 0.275386 },
  spotify: { label: "ESCUTAS/STREAMING (100% VISUALIZ.)", margin: 0.12 },
  "connected-tv": { label: "CONNECTED TV - HAWK", margin: 0.1360 },
  "rede-display": { label: "REDE DE DISPLAY", margin: 0.127986 },
  "youtube-shorts": { label: "YT - SHORTS", margin: 0.1520 },
  "youtube-instream": { label: "YT - IN STREAM", margin: 0.119996 },
  "rich-media": { label: "RICH MEDIA", margin: 0.2, spendIncludesMargin: true },
  whatsapp: { label: "WHATSAPP - DISPARO", margin: 0.2, spendIncludesMargin: true },
  "rede-pesquisa": { label: "REDE DE PESQUISA", margin: 0.198659 },
};

export function marginFor(lineId: LineId): number {
  const margin = PLATFORM_MARGINS[lineId].margin;
  if (!(margin > 0 && margin <= 1)) {
    throw new Error(`Margem inválida para ${lineId}: ${margin}. Use um valor entre 0 e 1.`);
  }
  return margin;
}

/** Gasto da plataforma → investimento exibido no dashboard. */
export function platformSpendToInvestment(lineId: LineId, platformSpend: number): number {
  if (PLATFORM_MARGINS[lineId].spendIncludesMargin) {
    return platformSpend;
  }
  return Math.round((platformSpend / marginFor(lineId)) * 100) / 100;
}
