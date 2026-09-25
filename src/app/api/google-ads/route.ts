import { getLineSummary } from "@/data";
import { getLineDatasets } from "@/data/server";
import type { LineId } from "@/data/types";

/** Dados reais das linhas do Google Ads, normalizados. Cache de 1h. */
export const revalidate = 3600;

const GOOGLE_LINE_IDS: LineId[] = ["rede-display", "rede-pesquisa", "youtube-shorts", "youtube-instream"];

export async function GET() {
  const datasets = await getLineDatasets();
  const payload = GOOGLE_LINE_IDS.map((lineId) => {
    const dataset = datasets[lineId];
    const summary = getLineSummary(lineId, datasets);
    return {
      lineId,
      status: dataset.status,
      message: dataset.message ?? null,
      campaign: dataset.externalName ?? null,
      flight: dataset.flight ?? null,
      fetchedAt: dataset.fetchedAt ?? null,
      totals: summary.hasData
        ? {
            spend: summary.spentRaw,
            delivered: summary.delivered,
            unitCost: summary.realizedUnitCost,
            metricProgress: summary.metricProgress,
            investmentProgress: summary.investmentProgress,
          }
        : null,
      complementary: summary.complementary,
      daily: dataset.rows,
    };
  });
  const failed = payload.every((line) => line.status === "error");
  return Response.json({ lines: payload }, { status: failed ? 502 : 200 });
}
