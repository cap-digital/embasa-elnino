/**
 * Tipos da camada de dados da campanha.
 * Tudo aqui é independente da fonte: hoje os dados são mockados
 * (ver ./daily.ts), amanhã podem vir de uma API sem mudar as páginas.
 */

export type StrategyId =
  | "alcance"
  | "trafego"
  | "visualizacoes"
  | "escutas"
  | "disparos";

export interface Strategy {
  id: StrategyId;
  /** Nome exibido: "Alcance", "Tráfego"… */
  label: string;
  /** Nome da métrica contratada no plural: "impressões", "cliques"… */
  metricLabel: string;
  /** Sigla do custo unitário: CPM, CPC, CPV, CPE. Null quando não há custo unitário contratado. */
  unitCostLabel: string | null;
  /** Divisor da métrica para calcular custo unitário (1000 para CPM, 1 para os demais). */
  unitCostPer: 1 | 1000;
}

export type LineId =
  | "rich-media"
  | "rede-display"
  | "video-hawk"
  | "rede-pesquisa"
  | "youtube-shorts"
  | "youtube-instream"
  | "connected-tv"
  | "native-taboola"
  | "spotify"
  | "whatsapp";

export interface ContractedLine {
  id: LineId;
  /** Ordem na tabela contratada (1–10). */
  order: number;
  name: string;
  shortName: string;
  /** Meio / formato / veículo, para a legenda secundária. */
  channel: string;
  strategy: StrategyId;
  /** Volume contratado da métrica principal. */
  contractedMetric: number;
  /** Custo unitário contratado em R$ (por 1.000 quando CPM). Null para WhatsApp. */
  contractedUnitCost: number | null;
  /** Investimento contratado em R$. */
  investment: number;
  /** Variável CSS da cor fixa da linha, usada em todos os gráficos e páginas. */
  color: string;
  /** Texto de apoio no menu lateral. `null` esconde; ausente usa `channel`. */
  navHint?: string | null;
}

export interface DailyRow {
  /** ISO yyyy-mm-dd */
  date: string;
  /** Gasto bruto no dia em R$. */
  spend: number;
  /** Métrica contratada entregue no dia. */
  delivered: number;
  /** Impressões (ou exibições de áudio / disparos enviados, conforme a estratégia). */
  impressions: number;
  clicks: number;
}

export interface LineDaily {
  lineId: LineId;
  rows: DailyRow[];
}

export interface Campaign {
  title: string;
  claim: string;
  client: string;
  /** ISO yyyy-mm-dd */
  startDate: string;
  endDate: string;
  totalInvestment: number;
}

/* ---------- Métricas complementares (uma forma por estratégia) ---------- */

export interface AlcanceMetrics {
  strategy: "alcance";
  impressions: number;
  reach: number;
  frequency: number;
  cpm: number;
  clicks: number;
  ctr: number;
}

export interface TrafegoMetrics {
  strategy: "trafego";
  clicks: number;
  cpc: number;
  impressions: number;
  ctr: number;
  cpm: number;
}

export interface VisualizacoesMetrics {
  strategy: "visualizacoes";
  views: number;
  cpv: number;
  impressions: number;
  vtr: number;
  clicks: number;
  quartiles: { q25: number; q50: number; q75: number; q100: number };
}

export interface EscutasMetrics {
  strategy: "escutas";
  listens: number;
  cpe: number;
  /** Escutas completas ÷ inícios. */
  completionRate: number;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  ctr: number;
  cpm: number;
  /** Funil de retenção do áudio (valores absolutos). */
  funnel: { starts: number; q25: number; q50: number; q75: number; completes: number };
}

export interface DisparosMetrics {
  strategy: "disparos";
  sent: number;
  delivered: number;
  deliveryRate: number;
  readRate: number;
  clicks: number;
  ctr: number;
}

export type ComplementaryMetrics =
  | AlcanceMetrics
  | TrafegoMetrics
  | VisualizacoesMetrics
  | EscutasMetrics
  | DisparosMetrics;

export type PaceStatus = "acima" | "no-ritmo" | "abaixo";

/* ------------------------------ Fontes de dados --------------------------- */

/**
 * Situação dos dados de uma linha (não há dados simulados no painel):
 * - `live`: dados reais vindos da API da plataforma.
 * - `pending`: integração pronta, mas a plataforma ainda não tem dados.
 * - `error`: a API não respondeu; nunca cai para dado simulado.
 */
export type LineDataStatus = "live" | "pending" | "error";

export type DataSourceId = "none" | "google-ads" | "spotify-ads" | "planilha";

/** Criativo (anúncio) com métricas do período inteiro. JSON puro. */
export interface Creative {
  id: string;
  name: string;
  kind: "image" | "video";
  /** Banner estático: URL pública da imagem e tamanho em pixels. */
  image?: { url: string; width: number; height: number };
  /** Vídeo do YouTube. */
  video?: { youtubeId: string; title: string; isShort: boolean };
  /** Vídeo no Google Drive (planilha): prévia e player embutido, sem link para o Drive. */
  driveVideo?: { fileId: string };
  impressions: number;
  clicks: number;
  /** Investimento (já convertido pela margem da plataforma). */
  spend: number;
  views: number;
  /** Retenção por quartil (vídeo), fração das impressões. */
  quartiles?: { q25: number; q50: number; q75: number; q100: number };
}

/** Palavra-chave de pesquisa com métricas do período inteiro. JSON puro. */
export interface Keyword {
  id: string;
  text: string;
  matchType: "BROAD" | "PHRASE" | "EXACT" | string;
  adGroup: string;
  status: string;
  /** Índice de qualidade (1–10); ausente até o Google calcular. */
  qualityScore?: number;
  impressions: number;
  clicks: number;
  /** Investimento (já convertido pela margem da plataforma). */
  spend: number;
}

/**
 * Tabela crua da planilha (uma linha por criativo e dia), com as colunas
 * originais. A coluna de investimento é removida na leitura. JSON puro.
 */
export interface SheetTable {
  columns: string[];
  /** Datas já em yyyy-mm-dd; percentuais como fração (0.0123 = 1,23%). */
  rows: Array<Array<string | number | null>>;
}

/** Métricas extras que só existem para o período inteiro (sem série diária). */
export interface LineExtras {
  reach?: number;
  frequency?: number;
  quartiles?: { q25: number; q50: number; q75: number; q100: number };
  funnel?: { starts: number; q25: number; q50: number; q75: number; completes: number };
}

/** Tudo que uma linha precisa para ser desenhada, de qualquer fonte. JSON puro. */
export interface LineDataset {
  lineId: LineId;
  status: LineDataStatus;
  source: DataSourceId;
  rows: DailyRow[];
  /** Período real de veiculação (ISO com fuso). Ausente nas linhas simuladas. */
  flight?: { start: string; end: string };
  extras?: LineExtras;
  /** Criativos com entrega no período (quando a plataforma informa). */
  creatives?: Creative[];
  /** Palavras-chave (campanhas de pesquisa), mesmo antes da primeira entrega. */
  keywords?: Keyword[];
  /** Tabela original da planilha (linhas que vêm da planilha). */
  sheetTable?: SheetTable;
  /** Orçamento diário da campanha na plataforma (convertido pela margem). */
  dailyBudget?: number;
  /** Nome da campanha na plataforma. */
  externalName?: string;
  /** Quando os dados foram buscados na API (ISO). */
  fetchedAt?: string;
  /** Mensagem para os estados `pending` e `error`. */
  message?: string;
}

/** Resumo consolidado de uma linha, já com as regras de progresso aplicadas. */
export interface LineSummary {
  line: ContractedLine;
  strategy: Strategy;
  /** Situação e origem dos dados desta linha. */
  status: LineDataStatus;
  source: DataSourceId;
  /** `false` para `pending` e `error`: a UI mostra o aviso de "ainda sem dados". */
  hasData: boolean;
  message?: string;
  fetchedAt?: string;
  externalName?: string;
  flight?: { start: string; end: string };
  /** Gasto bruto acumulado (pode ultrapassar o contratado). */
  spentRaw: number;
  /** Gasto exibido: travado no investimento contratado. */
  spent: number;
  /** 0–1, travado em 1. */
  investmentProgress: number;
  investmentComplete: boolean;
  delivered: number;
  /** 0–∞, pode passar de 1 (overdelivery). */
  metricProgress: number;
  overdelivery: boolean;
  goalReached: boolean;
  /** Custo unitário realizado (mesma base do contratado). Null quando não há. */
  realizedUnitCost: number | null;
  /** Fração esperada da meta para a data (ritmo linear). */
  expectedProgress: number;
  paceStatus: PaceStatus;
  /** Diferença em pontos percentuais entre realizado e esperado. */
  paceDelta: number;
  /** Null quando a linha não tem dados. */
  complementary: ComplementaryMetrics | null;
  creatives: Creative[];
  keywords: Keyword[];
  sheetTable: SheetTable | null;
  dailyBudget: number | null;
  daily: DailyRow[];
}

export interface CampaignSummary {
  campaign: Campaign;
  totalInvestment: number;
  spentRaw: number;
  spent: number;
  investmentProgress: number;
  investmentComplete: boolean;
  expectedProgress: number;
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;
  lines: LineSummary[];
  counts: Record<PaceStatus, number>;
  /** Última busca nas APIs (ISO), ou null se nenhuma respondeu. */
  lastUpdated: string | null;
  /** Linhas sem dados (pendentes ou com erro), fora dos totais. */
  withoutData: number;
  totals: {
    impressions: number;
    clicks: number;
    views: number;
    listens: number;
    sent: number;
  };
}
