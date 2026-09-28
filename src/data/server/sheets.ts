import "server-only";
import type { Creative, DailyRow, LineId, SheetTable } from "../types";
import { requireEnv, todayInBahia } from "./env";

/**
 * Cliente da planilha de mídia (Web App do Google Apps Script).
 * Um GET devolve todas as abas: { success, richMedia: [...], nativeADS: [...], ... }.
 * Cada aba é uma lista de linhas por criativo e dia; aqui viram série diária
 * da linha + criativos com o total do período.
 */

/** Aba da planilha → linha do painel. */
export const SHEET_TABS = {
  "rich-media": "richMedia",
  "native-taboola": "nativeADS",
  "video-hawk": "programaticaHAWK",
  "connected-tv": "connectedTV",
  whatsapp: "whatsapp",
} as const satisfies Partial<Record<LineId, string>>;

export type SheetLineId = keyof typeof SHEET_TABS;

/** Coluna da métrica contratada em cada linha (nomes aceitos, sem acento/caixa). */
const DELIVERED_COLUMNS: Record<SheetLineId, string[]> = {
  "rich-media": ["impressoes"],
  "native-taboola": ["cliques", "clicks"],
  "video-hawk": ["visualizacoes", "views", "videoviews", "completes", "visualizacoescompletas"],
  "connected-tv": ["visualizacoes", "views", "videoviews", "completes", "visualizacoescompletas"],
  whatsapp: ["disparos", "enviados", "envios"],
};

const COLUMNS = {
  date: ["data", "date", "dia"],
  spend: ["investimento", "gasto", "custo", "valor", "realcostlocal", "realcost", "cost"],
  impressions: ["impressoes", "impressions"],
  clicks: ["cliques", "clicks"],
  creative: ["banner", "criativo", "creative", "anuncio", "peca"],
  thumbnail: ["thumbnail", "thumb", "video", "link"],
};

/** Linhas de vídeo: o criativo vira vídeo (views = métrica contratada). */
const VIDEO_LINES = new Set<SheetLineId>(["video-hawk", "connected-tv"]);

/** ID do arquivo num link do Google Drive (/file/d/{id}/… ou ?id={id}). */
function driveFileId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const match = value.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([\w-]{10,})/);
  return match ? match[1] : null;
}

type SheetRow = Record<string, unknown>;

const normalize = (key: string) =>
  key
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

function pick(row: Map<string, unknown>, names: string[]): unknown {
  for (const name of names) {
    if (row.has(name)) {
      return row.get(name);
    }
  }
  return undefined;
}

/** Aceita número, "1.234,56" ou "R$ 1.500". */
function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value !== "string" || !value.trim()) {
    return 0;
  }
  const clean = value.replace(/[^\d,.-]/g, "");
  const parsed = Number(clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Data da planilha → yyyy-mm-dd no fuso da Bahia (ISO do Apps Script ou dd/mm/aaaa). */
function toDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) {
    return `${br[3]}-${br[2]}-${br[1]}`;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : todayInBahia(new Date(time));
}

export interface SheetLineData {
  rows: DailyRow[];
  creatives: Creative[];
  table: SheetTable;
}

/** Colunas da aba na ordem da planilha, sem a de investimento (não vai para o painel). */
function tableFor(tab: SheetRow[]): SheetTable {
  const columns = Object.keys(tab[0] ?? {}).filter((key) => !COLUMNS.spend.includes(normalize(key)));
  const rows = tab.map((raw) =>
    columns.map((column) => {
      const value = raw[column];
      if (COLUMNS.date.includes(normalize(column))) {
        return toDate(value);
      }
      if (typeof value === "number" || typeof value === "string") {
        return value;
      }
      return null;
    })
  );
  return { columns, rows };
}

function parseTab(lineId: SheetLineId, tab: SheetRow[]): SheetLineData {
  const byDate = new Map<string, DailyRow>();
  const byCreative = new Map<string, Creative>();

  for (const raw of tab) {
    const row = new Map(Object.entries(raw).map(([k, v]) => [normalize(k), v]));
    const date = toDate(pick(row, COLUMNS.date));
    if (!date) {
      continue;
    }
    const spend = toNumber(pick(row, COLUMNS.spend));
    const impressions = toNumber(pick(row, COLUMNS.impressions));
    const clicks = toNumber(pick(row, COLUMNS.clicks));
    const delivered = toNumber(pick(row, DELIVERED_COLUMNS[lineId]));

    const day = byDate.get(date) ?? { date, spend: 0, delivered: 0, impressions: 0, clicks: 0 };
    day.spend += spend;
    day.delivered += delivered;
    day.impressions += impressions;
    day.clicks += clicks;
    byDate.set(date, day);

    const name = pick(row, COLUMNS.creative);
    if (typeof name === "string" && name.trim()) {
      const isVideo = VIDEO_LINES.has(lineId);
      const creative: Creative = byCreative.get(name) ?? {
        id: `${lineId}:${normalize(name)}`,
        name: name.trim(),
        kind: isVideo ? "video" : "image",
        impressions: 0,
        clicks: 0,
        spend: 0,
        views: 0,
      };
      creative.impressions += impressions;
      creative.clicks += clicks;
      creative.spend += spend;
      if (isVideo) {
        creative.views += delivered;
      }
      const fileId = driveFileId(pick(row, COLUMNS.thumbnail));
      if (fileId && !creative.driveVideo) {
        creative.driveVideo = { fileId };
      }
      byCreative.set(name, creative);
    }
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  // A planilha traz dias zerados antes da veiculação: a série começa na 1ª entrega.
  const firstActive = days.findIndex((r) => r.impressions > 0 || r.delivered > 0 || r.spend > 0);
  return {
    rows: (firstActive === -1 ? [] : days.slice(firstActive)).map((r) => ({ ...r, spend: round(r.spend) })),
    creatives: [...byCreative.values()]
      .map((c) => ({ ...c, spend: round(c.spend) }))
      .sort((a, b) => b.impressions - a.impressions),
    table: tableFor(tab),
  };
}

/** Busca a planilha inteira e devolve os dados de cada linha. */
export async function fetchSheetLines(): Promise<Record<SheetLineId, SheetLineData>> {
  const response = await fetch(requireEnv("SHEETS_WEBAPP_URL"), {
    cache: "no-store",
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Planilha ${response.status}`);
  }
  const json = (await response.json()) as { success?: boolean; error?: string } & Record<string, unknown>;
  if (json.success === false) {
    throw new Error(`Planilha: ${json.error ?? "resposta sem sucesso"}`);
  }

  const result = {} as Record<SheetLineId, SheetLineData>;
  for (const [lineId, tabName] of Object.entries(SHEET_TABS) as Array<[SheetLineId, string]>) {
    const tab = json[tabName];
    result[lineId] = parseTab(lineId, Array.isArray(tab) ? (tab as SheetRow[]) : []);
  }
  return result;
}
