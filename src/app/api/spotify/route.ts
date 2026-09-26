import { getLineSummary } from "@/data";
import { getLineDatasets } from "@/data/server";

/** Dados reais da linha Spotify (Spotify Ads API), normalizados. Cache de 1h. */

// Renderiza a cada acesso lendo o cache de dados das APIs (1h, em
// src/data/server/sources.ts). Assim o botão "Atualizar dados" aparece na hora.
export const dynamic = "force-dynamic";

export async function GET() {
  const datasets = await getLineDatasets();
  const dataset = datasets.spotify;
  const summary = getLineSummary("spotify", datasets);
  return Response.json(
    {
      status: dataset.status,
      message: dataset.message ?? null,
      campaign: dataset.externalName ?? null,
      flight: dataset.flight ?? null,
      fetchedAt: dataset.fetchedAt ?? null,
      totals: summary.hasData
        ? {
            spend: summary.spentRaw,
            listens: summary.delivered,
            unitCost: summary.realizedUnitCost,
            metricProgress: summary.metricProgress,
            investmentProgress: summary.investmentProgress,
          }
        : null,
      complementary: summary.complementary,
      daily: dataset.rows,
    },
    { status: dataset.status === "error" ? 502 : 200 }
  );
}
