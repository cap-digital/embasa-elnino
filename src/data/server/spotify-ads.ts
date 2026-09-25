import "server-only";
import type { DailyRow, LineExtras } from "../types";
import { requireEnv } from "./env";

/**
 * Cliente mínimo da Spotify Ads API v3.
 * - Access token (1h) gerado via refresh token e cacheado em memória.
 * - Entidades ficam abaixo de /ad_accounts/{id}; o relatório agregado exige
 *   `entity_ids_type`, e `fields` é UMA string separada por vírgula.
 * - "Escutas" = COMPLETES.
 */

const API = "https://api-partner.spotify.com/ads/v3";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Renova com 5 minutos de folga.
  if (cachedToken && Date.now() < cachedToken.expiresAt - 5 * 60_000) {
    return cachedToken.value;
  }
  const basic = Buffer.from(
    `${requireEnv("SPOTIFY_CLIENT_ID")}:${requireEnv("SPOTIFY_CLIENT_SECRET")}`
  ).toString("base64");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: requireEnv("SPOTIFY_REFRESH_TOKEN"),
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Spotify token ${response.status}`);
  }
  const json = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const token = await getAccessToken();
  const url = new URL(`${API}/ad_accounts/${requireEnv("SPOTIFY_AD_ACCOUNT_ID")}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const text = (await response.text()).slice(0, 300);
    throw new Error(`Spotify ${response.status} em ${path}: ${text}`);
  }
  return (await response.json()) as T;
}

interface Stat {
  field_type: string;
  field_value: number;
}
interface ReportRow {
  start_time: string | null;
  stats: Stat[];
}
interface AdSet {
  id: string;
  name: string;
  start_time?: string;
  end_time?: string;
  budget?: { micro_amount?: number; currency?: string };
}

const statsToMap = (stats: Stat[]) =>
  Object.fromEntries(stats.map((s) => [s.field_type, Number(s.field_value) || 0])) as Record<
    string,
    number
  >;

export interface SpotifyCampaignData {
  name: string;
  status: string;
  flight: { start: string; end: string } | null;
  rows: DailyRow[];
  extras: LineExtras;
  lifetime: Record<string, number>;
}

export async function fetchSpotifyCampaign(): Promise<SpotifyCampaignData> {
  const campaignId = requireEnv("SPOTIFY_CAMPAIGN_ID");
  const [campaign, adSets] = await Promise.all([
    get<{ name: string; status: string }>(`/campaigns/${campaignId}`),
    get<{ ad_sets: AdSet[] }>("/ad_sets", { campaign_ids: campaignId, limit: "50" }),
  ]);

  const startTimes = adSets.ad_sets.map((a) => a.start_time).filter(Boolean) as string[];
  const endTimes = adSets.ad_sets.map((a) => a.end_time).filter(Boolean) as string[];
  const flight =
    startTimes.length && endTimes.length
      ? { start: startTimes.sort()[0], end: endTimes.sort().at(-1)! }
      : null;

  const base = {
    entity_type: "CAMPAIGN",
    entity_ids_type: "CAMPAIGN",
    entity_ids: campaignId,
  };

  const reportStart = flight ? `${flight.start.slice(0, 10)}T00:00:00Z` : undefined;
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  const [lifetime, daily] = await Promise.all([
    get<{ rows: ReportRow[] }>("/aggregate_reports", {
      ...base,
      granularity: "LIFETIME",
      fields:
        "SPEND,IMPRESSIONS,COMPLETES,REACH,FREQUENCY,STARTS,FIRST_QUARTILES,MIDPOINTS,THIRD_QUARTILES,CLICKS",
    }),
    reportStart
      ? get<{ rows: ReportRow[] }>("/aggregate_reports", {
          ...base,
          granularity: "DAY",
          fields: "SPEND,IMPRESSIONS,COMPLETES,CLICKS",
          report_start: reportStart,
          report_end: `${tomorrow}T00:00:00Z`,
        })
      : Promise.resolve({ rows: [] as ReportRow[] }),
  ]);

  const life = statsToMap(lifetime.rows[0]?.stats ?? []);
  const rows: DailyRow[] = daily.rows
    .filter((row) => row.start_time)
    .map((row) => {
      const m = statsToMap(row.stats);
      return {
        date: row.start_time!.slice(0, 10),
        spend: Math.round((m.SPEND ?? 0) * 100) / 100,
        delivered: m.COMPLETES ?? 0,
        impressions: m.IMPRESSIONS ?? 0,
        clicks: m.CLICKS ?? 0,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    name: campaign.name,
    status: campaign.status,
    flight,
    rows,
    lifetime: life,
    extras: {
      reach: life.REACH || undefined,
      frequency: life.FREQUENCY || undefined,
      funnel: {
        starts: life.STARTS ?? 0,
        q25: life.FIRST_QUARTILES ?? 0,
        q50: life.MIDPOINTS ?? 0,
        q75: life.THIRD_QUARTILES ?? 0,
        completes: life.COMPLETES ?? 0,
      },
    },
  };
}
