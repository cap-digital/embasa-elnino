import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { campaign } from "../campaign";
import { lines } from "../lines";
import { platformSpendToInvestment } from "../margins";
import type { DailyRow, LineDataset, LineId } from "../types";
import { todayInBahia } from "./env";
import { fetchGoogleCampaigns, fetchGoogleCreatives, fetchGoogleKeywords, toDailyRows } from "./google-ads";
import { fetchSheetLines, SHEET_TABS, type SheetLineId } from "./sheets";
import { fetchSpotifyCampaign } from "./spotify-ads";

/**
 * Origem dos dados de cada linha.
 * - Google Ads: Display, Shorts, In-Stream (por ID) e Pesquisa (por nome,
 *   enquanto a campanha não existir na API a linha fica "pendente").
 * - Spotify Ads: Spotify.
 * - Planilha (Apps Script): Rich Media, Vídeo HAWK, Connected TV e WhatsApp;
 *   aba vazia = linha "pendente".
 */
const GOOGLE_LINES = {
  "rede-display": { campaignId: "24281086224", delivered: "impressions" },
  "youtube-shorts": { campaignId: "24281159163", delivered: "views" },
  "youtube-instream": { campaignId: "24286590125", delivered: "views" },
  "rede-pesquisa": { campaignId: null, delivered: "clicks" },
} as const satisfies Partial<
  Record<LineId, { campaignId: string | null; delivered: "impressions" | "clicks" | "views" }>
>;

type GoogleLineId = keyof typeof GOOGLE_LINES;
const SEARCH_NAME_REGEX = "(?i).*SUPER EL NI[NÑ]O.*";

export const REVALIDATE_SECONDS = 3600;

/**
 * Completa com zero os dias sem entrega entre o início da veiculação e hoje.
 * As APIs só devolvem linhas para dias com atividade; um dia sem linha é,
 * de fato, zero — e os gráficos precisam da série contínua.
 */
function fillMissingDays(rows: DailyRow[], flightStart: string | undefined): DailyRow[] {
  if (!flightStart || rows.length === 0) {
    return rows;
  }
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const first = [flightStart.slice(0, 10), rows[0].date].sort()[0];
  const last = [todayInBahia(), rows.at(-1)!.date].sort().at(-1)!;
  const out: DailyRow[] = [];
  for (let d = new Date(`${first}T12:00:00Z`); d.toISOString().slice(0, 10) <= last; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = d.toISOString().slice(0, 10);
    out.push(byDate.get(date) ?? { date, spend: 0, delivered: 0, impressions: 0, clicks: 0 });
  }
  return out;
}

const NO_DATA_MESSAGE = "Estamos trabalhando para conectar os dados desta plataforma.";

/* --------------------------------- Google --------------------------------- */

const loadGoogle = unstable_cache(
  async (): Promise<Record<GoogleLineId, LineDataset>> => {
    const ids = Object.values(GOOGLE_LINES)
      .map((g): string | null => g.campaignId)
      .filter((id): id is string => Boolean(id));
    const { byId, searchIds } = await fetchGoogleCampaigns({
      ids,
      searchNameRegex: SEARCH_NAME_REGEX,
    });
    const fetchedAt = new Date().toISOString();

    const delivering = Object.values(byId).filter((c) => c.days.length > 0);
    const from = delivering
      .map((c) => c.flight?.start.slice(0, 10) ?? c.days[0].date)
      .sort()[0];
    const creativesByCampaign = from
      ? await fetchGoogleCreatives({
          campaignIds: delivering.map((c) => c.id),
          from,
          shortsCampaignIds: [GOOGLE_LINES["youtube-shorts"].campaignId],
        })
      : {};

    // Palavras-chave das campanhas de pesquisa (inclusive sem entrega ainda).
    const searchCampaigns = Object.values(byId).filter((c) => c.channel === "SEARCH");
    const keywordsByCampaign = searchCampaigns.length
      ? await fetchGoogleKeywords({
          campaignIds: searchCampaigns.map((c) => c.id),
          from: searchCampaigns.map((c) => c.flight?.start.slice(0, 10) ?? todayInBahia()).sort()[0],
        })
      : {};

    const result = {} as Record<GoogleLineId, LineDataset>;
    for (const [lineId, config] of Object.entries(GOOGLE_LINES) as Array<
      [GoogleLineId, (typeof GOOGLE_LINES)[GoogleLineId]]
    >) {
      const campaignId = config.campaignId ?? searchIds[0];
      const data = campaignId ? byId[campaignId] : undefined;

      if (!data) {
        result[lineId] = {
          lineId,
          status: "pending",
          source: "google-ads",
          rows: [],
          fetchedAt,
          message:
            lineId === "rede-pesquisa"
              ? "Campanha ainda não publicada no Google Ads."
              : "Campanha não encontrada no Google Ads.",
        };
        continue;
      }

      const rows = toDailyRows(data, config.delivered);
      const hasDelivery = rows.some((r) => r.impressions > 0 || r.spend > 0);
      result[lineId] = {
        lineId,
        status: hasDelivery ? "live" : "pending",
        source: "google-ads",
        rows: hasDelivery ? fillMissingDays(rows, data.flight?.start) : [],
        flight: data.flight ?? undefined,
        extras: hasDelivery ? data.extras : undefined,
        creatives: hasDelivery ? (creativesByCampaign[data.id] ?? []) : undefined,
        keywords: keywordsByCampaign[data.id],
        dailyBudget: data.dailyBudget ?? undefined,
        externalName: data.name,
        fetchedAt,
        message: hasDelivery ? undefined : "Campanha publicada, aguardando os primeiros dados.",
      };
    }
    return result;
  },
  ["google-ads-datasets-v5"],
  { revalidate: REVALIDATE_SECONDS, tags: ["google-ads"] }
);

/* --------------------------------- Spotify -------------------------------- */

const loadSpotify = unstable_cache(
  async (): Promise<LineDataset> => {
    const data = await fetchSpotifyCampaign();
    const hasDelivery = data.rows.some((r) => r.impressions > 0 || r.spend > 0);
    return {
      lineId: "spotify",
      status: hasDelivery ? "live" : "pending",
      source: "spotify-ads",
      rows: hasDelivery ? fillMissingDays(data.rows, data.flight?.start) : [],
      flight: data.flight ?? undefined,
      extras: hasDelivery ? data.extras : undefined,
      externalName: data.name,
      fetchedAt: new Date().toISOString(),
      message: hasDelivery ? undefined : "Campanha publicada, aguardando os primeiros dados.",
    };
  },
  ["spotify-ads-dataset-v2"],
  { revalidate: REVALIDATE_SECONDS, tags: ["spotify-ads"] }
);

/* -------------------------------- Planilha -------------------------------- */

const loadSheets = unstable_cache(
  async (): Promise<Record<SheetLineId, LineDataset>> => {
    const data = await fetchSheetLines();
    const fetchedAt = new Date().toISOString();
    const result = {} as Record<SheetLineId, LineDataset>;
    for (const lineId of Object.keys(SHEET_TABS) as SheetLineId[]) {
      const { rows, creatives, table } = data[lineId];
      const hasDelivery = rows.some((r) => r.impressions > 0 || r.delivered > 0 || r.spend > 0);
      result[lineId] = {
        lineId,
        status: hasDelivery ? "live" : "pending",
        source: "planilha",
        rows: hasDelivery ? fillMissingDays(rows, rows[0]?.date) : [],
        // A planilha não informa o período: do 1º dia com entrega ao fim da
        // campanha (usado no ritmo esperado e em "faltam / necessário por dia").
        flight: hasDelivery
          ? { start: `${rows[0].date}T00:00:00-03:00`, end: `${campaign.endDate}T23:59:59-03:00` }
          : undefined,
        creatives: hasDelivery ? creatives : undefined,
        sheetTable: hasDelivery ? table : undefined,
        fetchedAt,
        message: hasDelivery ? undefined : NO_DATA_MESSAGE,
      };
    }
    return result;
  },
  ["planilha-datasets-v5"],
  { revalidate: REVALIDATE_SECONDS, tags: ["planilha"] }
);

/* -------------------------------- Agregado -------------------------------- */

function errorDataset(lineId: LineId, source: LineDataset["source"], error: unknown): LineDataset {
  console.error(`[dados] falha ao carregar ${lineId} (${source}):`, error);
  return {
    lineId,
    status: "error",
    source,
    rows: [],
    message: NO_DATA_MESSAGE,
  };
}

/**
 * Converte o gasto bruto da plataforma no investimento exibido
 * (gasto ÷ margem da linha, ver ../margins.ts). Único ponto da conversão:
 * tudo a jusante (totais, barras, CPM/CPV/CPC/CPE) usa o valor convertido.
 */
function applyMargin(dataset: LineDataset): LineDataset {
  return {
    ...dataset,
    rows: dataset.rows.map((row) => ({
      ...row,
      spend: platformSpendToInvestment(dataset.lineId, row.spend),
    })),
    creatives: dataset.creatives?.map((creative) => ({
      ...creative,
      spend: platformSpendToInvestment(dataset.lineId, creative.spend),
    })),
    dailyBudget:
      dataset.dailyBudget !== undefined
        ? platformSpendToInvestment(dataset.lineId, dataset.dailyBudget)
        : undefined,
    keywords: dataset.keywords?.map((keyword) => ({
      ...keyword,
      spend: platformSpendToInvestment(dataset.lineId, keyword.spend),
    })),
  };
}

/** Datasets de todas as linhas. Deduplicado por request; APIs com cache de 1h. */
export const getLineDatasets = cache(async (): Promise<Record<LineId, LineDataset>> => {
  const [google, spotify, sheets] = await Promise.allSettled([loadGoogle(), loadSpotify(), loadSheets()]);

  const datasets = {} as Record<LineId, LineDataset>;
  for (const line of lines) {
    if (line.id === "spotify") {
      datasets[line.id] =
        spotify.status === "fulfilled" ? spotify.value : errorDataset(line.id, "spotify-ads", spotify.reason);
    } else if (line.id in GOOGLE_LINES) {
      datasets[line.id] =
        google.status === "fulfilled"
          ? google.value[line.id as GoogleLineId]
          : errorDataset(line.id, "google-ads", google.reason);
    } else if (line.id in SHEET_TABS) {
      datasets[line.id] =
        sheets.status === "fulfilled"
          ? sheets.value[line.id as SheetLineId]
          : errorDataset(line.id, "planilha", sheets.reason);
    } else {
      datasets[line.id] = {
        lineId: line.id,
        status: "pending",
        source: "none",
        rows: [],
        message: NO_DATA_MESSAGE,
      };
    }
  }
  for (const line of lines) {
    datasets[line.id] = applyMargin(datasets[line.id]);
  }
  return datasets;
});

export const NO_DATA_TEXT = NO_DATA_MESSAGE;
