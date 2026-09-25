import type { ContractedLine, LineId } from "./types";

/**
 * As 10 linhas contratadas. Cada linha tem uma cor fixa (variável CSS definida
 * em globals.css) usada em todos os gráficos e páginas.
 */
export const lines: ContractedLine[] = [
  {
    id: "rich-media",
    order: 1,
    name: "Rich Media",
    shortName: "Rich Media",
    channel: "Desktop e Mobile",
    strategy: "alcance",
    contractedMetric: 500_000,
    contractedUnitCost: 60,
    investment: 30_000,
    color: "var(--line-rich-media)",
  },
  {
    id: "rede-display",
    order: 2,
    name: "Rede de Display",
    shortName: "Display",
    channel: "Google",
    strategy: "alcance",
    contractedMetric: 2_272_727,
    contractedUnitCost: 11,
    investment: 25_000,
    color: "var(--line-rede-display)",
  },
  {
    id: "video-hawk",
    order: 3,
    name: "Rede de Vídeo HAWK",
    shortName: "Vídeo HAWK",
    channel: "Programática",
    strategy: "visualizacoes",
    contractedMetric: 166_667,
    contractedUnitCost: 0.12,
    investment: 20_000,
    color: "var(--line-video-hawk)",
  },
  {
    id: "rede-pesquisa",
    order: 4,
    name: "Rede de Pesquisa",
    shortName: "Pesquisa",
    channel: "Google Search",
    strategy: "trafego",
    contractedMetric: 4_688,
    contractedUnitCost: 3.2,
    investment: 15_000,
    color: "var(--line-rede-pesquisa)",
  },
  {
    id: "youtube-shorts",
    order: 5,
    name: "YouTube Shorts",
    shortName: "Shorts",
    channel: "YouTube",
    strategy: "visualizacoes",
    contractedMetric: 111_111,
    contractedUnitCost: 0.18,
    investment: 20_000,
    color: "var(--line-youtube-shorts)",
  },
  {
    id: "youtube-instream",
    order: 6,
    name: "YouTube In-Stream",
    shortName: "In-Stream",
    channel: "TrueView",
    strategy: "visualizacoes",
    contractedMetric: 178_571,
    contractedUnitCost: 0.14,
    investment: 25_000,
    color: "var(--line-youtube-instream)",
  },
  {
    id: "connected-tv",
    order: 7,
    name: "Connected TV HAWK",
    shortName: "Connected TV",
    channel: "Samsung, LG, Pluto e Globoplay",
    navHint: null,
    strategy: "visualizacoes",
    contractedMetric: 57_143,
    contractedUnitCost: 0.35,
    investment: 20_000,
    color: "var(--line-connected-tv)",
  },
  {
    id: "native-taboola",
    order: 8,
    name: "Native Ads Taboola",
    shortName: "Taboola",
    channel: "Native Ads",
    strategy: "trafego",
    contractedMetric: 3_125,
    contractedUnitCost: 3.2,
    investment: 10_000,
    color: "var(--line-native-taboola)",
  },
  {
    id: "spotify",
    order: 9,
    name: "Spotify",
    shortName: "Spotify",
    channel: "Áudio + Banner",
    strategy: "escutas",
    contractedMetric: 83_333,
    contractedUnitCost: 0.18,
    investment: 15_000,
    color: "var(--line-spotify)",
  },
  {
    id: "whatsapp",
    order: 10,
    name: "WhatsApp",
    shortName: "WhatsApp",
    channel: "Disparos",
    strategy: "disparos",
    contractedMetric: 10_000,
    contractedUnitCost: null,
    investment: 15_000,
    color: "var(--line-whatsapp)",
  },
];

export const lineById: Record<LineId, ContractedLine> = Object.fromEntries(
  lines.map((line) => [line.id, line])
) as Record<LineId, ContractedLine>;

export const lineIds: LineId[] = lines.map((line) => line.id);

export function isLineId(value: string): value is LineId {
  return (lineIds as string[]).includes(value);
}
