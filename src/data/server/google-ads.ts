import "server-only";
import { JWT } from "google-auth-library";
import type { Creative, DailyRow, Keyword, LineExtras } from "../types";
import { ACCOUNT_TZ_OFFSET, requireEnv, todayInBahia } from "./env";

/**
 * Cliente mínimo da Google Ads API (REST v25, searchStream).
 * Auth: service account com Domain-Wide Delegation (JWT com `subject`).
 * Tudo aqui roda só no servidor.
 */

const API = "https://googleads.googleapis.com/v25";
const SCOPE = "https://www.googleapis.com/auth/adwords";

let jwtClient: JWT | null = null;

function getJwt(): JWT {
  if (!jwtClient) {
    const key = JSON.parse(
      Buffer.from(requireEnv("GOOGLE_ADS_SA_KEY_B64"), "base64").toString("utf8")
    ) as { client_email: string; private_key: string };
    jwtClient = new JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: [SCOPE],
      subject: requireEnv("GOOGLE_ADS_IMPERSONATE_EMAIL"),
    });
  }
  return jwtClient;
}

interface GoogleAdsRow {
  campaign?: {
    id?: string;
    name?: string;
    status?: string;
    advertisingChannelType?: string;
    startDateTime?: string;
    endDateTime?: string;
  };
  segments?: { date?: string };
  metrics?: Record<string, string | number | undefined>;
  campaignBudget?: { amountMicros?: string };
}

async function search(query: string): Promise<GoogleAdsRow[]> {
  // O JWT do google-auth-library guarda o token e só renova perto de expirar.
  const { token } = await getJwt().getAccessToken();
  if (!token) {
    throw new Error("Google Ads: não foi possível obter o access token");
  }
  const customerId = requireEnv("GOOGLE_ADS_CUSTOMER_ID");
  const response = await fetch(`${API}/customers/${customerId}/googleAds:searchStream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "developer-token": requireEnv("GOOGLE_ADS_DEVELOPER_TOKEN"),
      "login-customer-id": requireEnv("GOOGLE_ADS_LOGIN_CUSTOMER_ID"),
      "content-type": "application/json",
    },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });
  const body = (await response.json()) as Array<{ results?: GoogleAdsRow[] }> | unknown;
  if (!response.ok) {
    const detail = JSON.stringify(body).slice(0, 300);
    throw new Error(`Google Ads ${response.status}: ${detail}`);
  }
  return (body as Array<{ results?: GoogleAdsRow[] }>).flatMap((chunk) => chunk.results ?? []);
}

const num = (value: string | number | undefined) => (value === undefined ? 0 : Number(value));

/** "2026-09-24 19:18:27" (fuso da conta) → ISO com fuso. */
function toIso(dateTime: string | undefined): string | undefined {
  if (!dateTime) {
    return undefined;
  }
  return `${dateTime.replace(" ", "T")}${ACCOUNT_TZ_OFFSET}`;
}

export interface GoogleCampaignData {
  id: string;
  name: string;
  status: string;
  channel: string;
  flight: { start: string; end: string } | null;
  /** Orçamento diário BRUTO da plataforma (R$). */
  dailyBudget: number | null;
  /** Série diária, com a métrica contratada ainda por decidir (ver `delivered`). */
  days: Array<{
    date: string;
    impressions: number;
    clicks: number;
    cost: number;
    views: number;
    q25: number;
    q50: number;
    q75: number;
    q100: number;
  }>;
  extras: LineExtras;
}

const CAMPAIGN_FIELDS =
  "campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.start_date_time, campaign.end_date_time, campaign_budget.amount_micros";

/** Busca metadados, série diária e alcance de um conjunto de campanhas. */
export async function fetchGoogleCampaigns(options: {
  ids: string[];
  /** Regex de nome para campanhas de pesquisa ainda não publicadas. */
  searchNameRegex?: string;
}): Promise<{ byId: Record<string, GoogleCampaignData>; searchIds: string[] }> {
  const idList = options.ids.join(", ");
  const [byIdMeta, searchMeta] = await Promise.all([
    options.ids.length
      ? search(`SELECT ${CAMPAIGN_FIELDS} FROM campaign WHERE campaign.id IN (${idList})`)
      : Promise.resolve([]),
    options.searchNameRegex
      ? search(
          `SELECT ${CAMPAIGN_FIELDS} FROM campaign WHERE campaign.advertising_channel_type = 'SEARCH' AND campaign.status != 'REMOVED' AND campaign.name REGEXP_MATCH '${options.searchNameRegex}'`
        )
      : Promise.resolve([]),
  ]);

  const meta = [...byIdMeta, ...searchMeta].filter((row) => row.campaign?.id);
  const byId: Record<string, GoogleCampaignData> = {};
  for (const row of meta) {
    const c = row.campaign!;
    const start = toIso(c.startDateTime);
    const end = toIso(c.endDateTime);
    byId[c.id!] = {
      id: c.id!,
      name: c.name ?? "",
      status: c.status ?? "",
      channel: c.advertisingChannelType ?? "",
      flight: start && end ? { start, end } : null,
      dailyBudget: row.campaignBudget?.amountMicros ? num(row.campaignBudget.amountMicros) / 1_000_000 : null,
      days: [],
      extras: {},
    };
  }
  const allIds = Object.keys(byId);
  if (allIds.length === 0) {
    return { byId, searchIds: [] };
  }

  const today = todayInBahia();
  const starts = Object.values(byId)
    .map((c) => c.flight?.start.slice(0, 10))
    .filter((d): d is string => Boolean(d));
  const from = starts.length ? starts.sort()[0] : today;
  const where = `campaign.id IN (${allIds.join(", ")}) AND segments.date BETWEEN '${from}' AND '${today}'`;

  const [daily, reach] = await Promise.all([
    search(
      `SELECT campaign.id, segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.video_trueview_views, metrics.video_quartile_p25_rate, metrics.video_quartile_p50_rate, metrics.video_quartile_p75_rate, metrics.video_quartile_p100_rate FROM campaign WHERE ${where} ORDER BY segments.date`
    ),
    search(
      `SELECT campaign.id, metrics.unique_users, metrics.average_impression_frequency_per_user FROM campaign WHERE ${where}`
    ),
  ]);

  for (const row of daily) {
    const target = byId[row.campaign?.id ?? ""];
    if (!target || !row.segments?.date) {
      continue;
    }
    const m = row.metrics ?? {};
    target.days.push({
      date: row.segments.date,
      impressions: num(m.impressions),
      clicks: num(m.clicks),
      cost: num(m.costMicros) / 1_000_000,
      views: num(m.videoTrueviewViews),
      q25: num(m.videoQuartileP25Rate),
      q50: num(m.videoQuartileP50Rate),
      q75: num(m.videoQuartileP75Rate),
      q100: num(m.videoQuartileP100Rate),
    });
  }

  for (const row of reach) {
    const target = byId[row.campaign?.id ?? ""];
    if (!target) {
      continue;
    }
    const users = num(row.metrics?.uniqueUsers);
    if (users > 0) {
      target.extras.reach = users;
      target.extras.frequency = num(row.metrics?.averageImpressionFrequencyPerUser);
    }
  }

  // Retenção por quartil: média das taxas diárias ponderada por impressões.
  for (const campaign of Object.values(byId)) {
    const totalImpr = campaign.days.reduce((acc, d) => acc + d.impressions, 0);
    const hasVideo = campaign.days.some((d) => d.q25 > 0);
    if (hasVideo && totalImpr > 0) {
      const w = (key: "q25" | "q50" | "q75" | "q100") =>
        campaign.days.reduce((acc, d) => acc + d[key] * d.impressions, 0) / totalImpr;
      campaign.extras.quartiles = { q25: w("q25"), q50: w("q50"), q75: w("q75"), q100: w("q100") };
    }
  }

  return { byId, searchIds: searchMeta.map((row) => row.campaign!.id!).filter(Boolean) };
}

/** Converte a série do Google para `DailyRow`, escolhendo a métrica contratada. */
export function toDailyRows(
  campaign: GoogleCampaignData,
  delivered: "impressions" | "clicks" | "views"
): DailyRow[] {
  return campaign.days.map((d) => ({
    date: d.date,
    spend: Math.round(d.cost * 100) / 100,
    delivered: d[delivered],
    impressions: d.impressions,
    clicks: d.clicks,
  }));
}

interface AdRow {
  campaign?: { id?: string };
  adGroupAd?: {
    ad?: {
      id?: string;
      name?: string;
      type?: string;
      imageAd?: { imageUrl?: string; pixelWidth?: string; pixelHeight?: string };
      videoResponsiveAd?: { videos?: Array<{ asset?: string }> };
      videoAd?: { video?: { asset?: string } };
    };
  };
  metrics?: Record<string, string | number | undefined>;
}

/**
 * Criativos com entrega no período, por campanha. O custo volta BRUTO da
 * plataforma (a margem é aplicada em sources.ts, como na série diária).
 */
export async function fetchGoogleCreatives(options: {
  campaignIds: string[];
  from: string;
  /** Campanhas cujos vídeos são Shorts (link /shorts/). */
  shortsCampaignIds?: string[];
}): Promise<Record<string, Creative[]>> {
  if (options.campaignIds.length === 0) {
    return {};
  }
  const today = todayInBahia();
  const rows = (await search(
    `SELECT campaign.id, ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type, ad_group_ad.ad.image_ad.image_url, ad_group_ad.ad.image_ad.pixel_width, ad_group_ad.ad.image_ad.pixel_height, ad_group_ad.ad.video_responsive_ad.videos, ad_group_ad.ad.video_ad.video.asset, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.video_trueview_views, metrics.video_quartile_p25_rate, metrics.video_quartile_p50_rate, metrics.video_quartile_p75_rate, metrics.video_quartile_p100_rate FROM ad_group_ad WHERE campaign.id IN (${options.campaignIds.join(", ")}) AND ad_group_ad.status != 'REMOVED' AND segments.date BETWEEN '${options.from}' AND '${today}' AND metrics.impressions > 0`
  )) as AdRow[];

  // Resolve assets de vídeo → ID e título no YouTube.
  const assetIds = new Set<string>();
  for (const row of rows) {
    const ad = row.adGroupAd?.ad;
    const asset = ad?.videoResponsiveAd?.videos?.[0]?.asset ?? ad?.videoAd?.video?.asset;
    const id = asset?.split("/").pop();
    if (id) {
      assetIds.add(id);
    }
  }
  const videoByAsset = new Map<string, { youtubeId: string; title: string }>();
  if (assetIds.size) {
    const assets = (await search(
      `SELECT asset.id, asset.youtube_video_asset.youtube_video_id, asset.youtube_video_asset.youtube_video_title FROM asset WHERE asset.id IN (${[...assetIds].join(", ")})`
    )) as Array<{ asset?: { id?: string; youtubeVideoAsset?: { youtubeVideoId?: string; youtubeVideoTitle?: string } } }>;
    for (const a of assets) {
      const yt = a.asset?.youtubeVideoAsset;
      if (a.asset?.id && yt?.youtubeVideoId) {
        videoByAsset.set(a.asset.id, { youtubeId: yt.youtubeVideoId, title: yt.youtubeVideoTitle ?? "" });
      }
    }
  }

  const shorts = new Set(options.shortsCampaignIds ?? []);
  const byCampaign: Record<string, Creative[]> = {};
  for (const row of rows) {
    const campaignId = row.campaign?.id;
    const ad = row.adGroupAd?.ad;
    if (!campaignId || !ad?.id) {
      continue;
    }
    const m = row.metrics ?? {};
    const assetId = (ad.videoResponsiveAd?.videos?.[0]?.asset ?? ad.videoAd?.video?.asset)?.split("/").pop();
    const video = assetId ? videoByAsset.get(assetId) : undefined;
    const q25 = num(m.videoQuartileP25Rate);
    const creative: Creative = {
      id: ad.id,
      name: ad.name || (ad.imageAd ? `${ad.imageAd.pixelWidth}×${ad.imageAd.pixelHeight}` : `Anúncio ${ad.id}`),
      kind: video ? "video" : "image",
      image: ad.imageAd?.imageUrl
        ? { url: ad.imageAd.imageUrl, width: Number(ad.imageAd.pixelWidth) || 0, height: Number(ad.imageAd.pixelHeight) || 0 }
        : undefined,
      video: video ? { ...video, isShort: shorts.has(campaignId) } : undefined,
      impressions: num(m.impressions),
      clicks: num(m.clicks),
      spend: num(m.costMicros) / 1_000_000,
      views: num(m.videoTrueviewViews),
      quartiles:
        q25 > 0
          ? { q25, q50: num(m.videoQuartileP50Rate), q75: num(m.videoQuartileP75Rate), q100: num(m.videoQuartileP100Rate) }
          : undefined,
    };
    (byCampaign[campaignId] ??= []).push(creative);
  }
  for (const list of Object.values(byCampaign)) {
    list.sort((a, b) => b.impressions - a.impressions);
  }
  return byCampaign;
}

/**
 * Palavras-chave de campanhas de pesquisa, com métricas somadas no período.
 * Vêm todas (inclusive sem entrega); custo BRUTO (margem em sources.ts).
 */
export async function fetchGoogleKeywords(options: {
  campaignIds: string[];
  from: string;
}): Promise<Record<string, Keyword[]>> {
  if (options.campaignIds.length === 0) {
    return {};
  }
  const today = todayInBahia();
  const rows = (await search(
    `SELECT campaign.id, ad_group.name, ad_group_criterion.criterion_id, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group_criterion.status, ad_group_criterion.quality_info.quality_score, metrics.impressions, metrics.clicks, metrics.cost_micros FROM keyword_view WHERE campaign.id IN (${options.campaignIds.join(", ")}) AND ad_group_criterion.status != 'REMOVED' AND segments.date BETWEEN '${options.from}' AND '${today}'`
  )) as Array<{
    campaign?: { id?: string };
    adGroup?: { name?: string };
    adGroupCriterion?: {
      criterionId?: string;
      status?: string;
      keyword?: { text?: string; matchType?: string };
      qualityInfo?: { qualityScore?: number };
    };
    metrics?: Record<string, string | number | undefined>;
  }>;

  // O searchStream com segments.date no WHERE agrega por critério; ainda assim
  // somamos por ID para o caso de vir mais de uma linha do mesmo critério.
  const byCampaign: Record<string, Map<string, Keyword>> = {};
  for (const row of rows) {
    const campaignId = row.campaign?.id;
    const c = row.adGroupCriterion;
    if (!campaignId || !c?.criterionId || !c.keyword?.text) {
      continue;
    }
    const map = (byCampaign[campaignId] ??= new Map());
    const key = `${row.adGroup?.name ?? ""}::${c.criterionId}`;
    const current = map.get(key) ?? {
      id: c.criterionId,
      text: c.keyword.text,
      matchType: c.keyword.matchType ?? "",
      adGroup: row.adGroup?.name ?? "",
      status: c.status ?? "",
      qualityScore: c.qualityInfo?.qualityScore,
      impressions: 0,
      clicks: 0,
      spend: 0,
    };
    current.impressions += num(row.metrics?.impressions);
    current.clicks += num(row.metrics?.clicks);
    current.spend += num(row.metrics?.costMicros) / 1_000_000;
    map.set(key, current);
  }

  const result: Record<string, Keyword[]> = {};
  for (const [campaignId, map] of Object.entries(byCampaign)) {
    result[campaignId] = [...map.values()].sort(
      (a, b) => b.clicks - a.clicks || b.impressions - a.impressions || a.text.localeCompare(b.text, "pt-BR")
    );
  }
  return result;
}
