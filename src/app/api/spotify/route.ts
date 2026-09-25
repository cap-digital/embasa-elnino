import { getLineSummary } from "@/data";
import { getLineDatasets } from "@/data/server";

/** Dados reais da linha Spotify (Spotify Ads API), normalizados. Cache de 1h. */
export const revalidate = 3600;

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
