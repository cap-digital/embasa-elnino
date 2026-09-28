import { campaign } from "./campaign";
import { lineById, lines } from "./lines";
import { strategies } from "./strategies";
import type {
  CampaignSummary,
  ComplementaryMetrics,
  ContractedLine,
  DailyRow,
  LineDataset,
  LineExtras,
  LineId,
  LineSummary,
  PaceStatus,
} from "./types";

/** Datasets de todas as linhas (ver `@/data/server`). */
export type Datasets = Record<LineId, LineDataset>;

/** Tolerância (em fração) para considerar uma linha "no ritmo". */
export const PACE_TOLERANCE = 0.03;

/* -------------------- Regras obrigatórias de progresso -------------------- */

/** Barra de investimento: NUNCA passa de 100%. */
export function clampInvestment(spentRaw: number, contracted: number) {
  const spent = Math.min(spentRaw, contracted);
  const progress = contracted > 0 ? Math.min(spentRaw / contracted, 1) : 0;
  return {
    spent,
    progress,
    complete: spentRaw >= contracted - 0.005,
  };
}

/** Barra da métrica: PODE passar de 100%; o excedente é overdelivery. */
export function metricProgress(delivered: number, contracted: number) {
  const progress = contracted > 0 ? delivered / contracted : 0;
  return {
    progress,
    overdelivery: progress > 1,
    goalReached: progress >= 1,
  };
}

export function paceStatus(actual: number, expected: number): PaceStatus {
  const delta = actual - expected;
  if (delta >= PACE_TOLERANCE) {
    return "acima";
  }
  if (delta <= -PACE_TOLERANCE) {
    return "abaixo";
  }
  return "no-ritmo";
}

/* ------------------------------ Datas / ritmo ----------------------------- */

function daysBetweenInclusive(a: string, b: string) {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

/** Data yyyy-mm-dd no fuso da Bahia. */
function bahiaDate(at: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bahia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(at));
}

/** Calendário geral da campanha na data de referência (padrão: agora). */
export function campaignCalendar(asOf: number = Date.now()) {
  const daysTotal = daysBetweenInclusive(campaign.startDate, campaign.endDate);
  const daysElapsed = Math.min(
    Math.max(daysBetweenInclusive(campaign.startDate, bahiaDate(asOf)), 0),
    daysTotal
  );
  return {
    daysTotal,
    daysElapsed,
    daysRemaining: Math.max(daysTotal - daysElapsed, 0),
    expectedProgress: daysElapsed / daysTotal,
  };
}

/* ---------------------------- Ritmo por linha ----------------------------- */


/**
 * Fração esperada da meta numa data.
 * - Pelas datas reais de veiculação da própria campanha (API).
 * - Sem datas na API: pelo calendário geral da campanha.
 * `at` é o fim do dia considerado (ou "agora" para o total).
 */
function expectedFraction(dataset: LineDataset, at: number): number {
  if (dataset.flight) {
    const start = Date.parse(dataset.flight.start);
    const end = Date.parse(dataset.flight.end);
    if (end > start) {
      return Math.min(Math.max((at - start) / (end - start), 0), 1);
    }
  }
  const start = Date.parse(`${campaign.startDate}T00:00:00-03:00`);
  const end = Date.parse(`${campaign.endDate}T23:59:59-03:00`);
  return Math.min(Math.max((at - start) / (end - start), 0), 1);
}

/** Momento de referência: quando os dados foram buscados na API. */
function referenceTime(dataset: LineDataset): number {
  return dataset.fetchedAt ? Date.parse(dataset.fetchedAt) : Date.now();
}

/* --------------------------- Métricas complementares ---------------------- */

function sum(rows: DailyRow[], key: keyof DailyRow) {
  return rows.reduce((acc, row) => acc + (row[key] as number), 0);
}

const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

/**
 * Métricas complementares da estratégia, só com o que a API entrega.
 * O que a plataforma não informa fica 0 (nunca estimado).
 */
function complementaryFor(
  line: ContractedLine,
  rows: DailyRow[],
  spentRaw: number,
  extras: LineExtras | undefined
): ComplementaryMetrics {
  const delivered = sum(rows, "delivered");
  const impressions = sum(rows, "impressions");
  const clicks = sum(rows, "clicks");

  switch (line.strategy) {
    case "alcance": {
      const frequency = extras?.frequency ?? 0;
      const reach = extras?.reach ?? 0;
      return {
        strategy: "alcance",
        impressions,
        reach,
        frequency,
        cpm: safeDiv(spentRaw, impressions) * 1000,
        clicks,
        ctr: safeDiv(clicks, impressions),
      };
    }
    case "trafego":
      return {
        strategy: "trafego",
        clicks: delivered,
        cpc: safeDiv(spentRaw, delivered),
        impressions,
        ctr: safeDiv(delivered, impressions),
        cpm: safeDiv(spentRaw, impressions) * 1000,
      };
    case "visualizacoes":
      return {
        strategy: "visualizacoes",
        views: delivered,
        cpv: safeDiv(spentRaw, delivered),
        impressions,
        vtr: safeDiv(delivered, impressions),
        quartiles: extras?.quartiles ?? { q25: 0, q50: 0, q75: 0, q100: 0 },
      };
    case "escutas": {
      const funnel = extras?.funnel ?? { starts: 0, q25: 0, q50: 0, q75: 0, completes: 0 };
      return {
        strategy: "escutas",
        listens: delivered,
        cpe: safeDiv(spentRaw, delivered),
        completionRate: safeDiv(funnel.completes, funnel.starts),
        impressions,
        reach: extras?.reach ?? 0,
        frequency: extras?.frequency ?? 0,
        clicks,
        ctr: safeDiv(clicks, impressions),
        cpm: safeDiv(spentRaw, impressions) * 1000,
        funnel,
      };
    }
    case "disparos":
      // Entregas e leituras dependem da integração do WhatsApp (ainda sem API).
      return {
        strategy: "disparos",
        sent: delivered,
        delivered: 0,
        deliveryRate: 0,
        readRate: 0,
        clicks,
        ctr: 0,
      };
  }
}

/* ------------------------------- Resumos ---------------------------------- */

export function getLineSummary(lineId: LineId, datasets: Datasets): LineSummary {
  const line = lineById[lineId];
  const strategy = strategies[line.strategy];
  const dataset = datasets[lineId];
  const hasData = dataset.status === "live";
  const rows = hasData ? dataset.rows : [];

  const spentRaw = Math.round(sum(rows, "spend") * 100) / 100;
  const delivered = sum(rows, "delivered");
  const investment = clampInvestment(spentRaw, line.investment);
  const metric = metricProgress(delivered, line.contractedMetric);
  const expectedProgress = expectedFraction(dataset, referenceTime(dataset));
  const realizedUnitCost =
    !hasData || line.contractedUnitCost === null || delivered === 0
      ? null
      : safeDiv(spentRaw, delivered) * strategy.unitCostPer;

  return {
    line,
    strategy,
    status: dataset.status,
    source: dataset.source,
    hasData,
    message: dataset.message,
    fetchedAt: dataset.fetchedAt,
    externalName: dataset.externalName,
    flight: dataset.flight,
    spentRaw,
    spent: investment.spent,
    investmentProgress: investment.progress,
    investmentComplete: hasData && investment.complete,
    delivered,
    metricProgress: metric.progress,
    overdelivery: metric.overdelivery,
    goalReached: metric.goalReached,
    realizedUnitCost,
    expectedProgress,
    paceStatus: paceStatus(metric.progress, expectedProgress),
    paceDelta: metric.progress - expectedProgress,
    complementary: hasData
      ? complementaryFor(line, rows, spentRaw, dataset.extras)
      : null,
    creatives: hasData ? (dataset.creatives ?? []) : [],
    // Palavras-chave aparecem mesmo antes da primeira entrega.
    keywords: dataset.keywords ?? [],
    sheetTable: hasData ? (dataset.sheetTable ?? null) : null,
    dailyBudget: dataset.dailyBudget ?? null,
    daily: rows,
  };
}

export function getCampaignSummary(datasets: Datasets): CampaignSummary {
  const fetched = Object.values(datasets)
    .map((d) => d.fetchedAt)
    .filter((d): d is string => Boolean(d))
    .sort();
  const lastUpdated = fetched.at(-1) ?? null;
  const calendar = campaignCalendar(lastUpdated ? Date.parse(lastUpdated) : Date.now());
  const lineSummaries = lines.map((line) => getLineSummary(line.id, datasets));
  const withData = lineSummaries.filter((s) => s.hasData);
  const spentRaw = withData.reduce((acc, s) => acc + s.spentRaw, 0);
  // Total = soma dos gastos já travados por linha, e travado de novo no total.
  const spentCapped = withData.reduce((acc, s) => acc + s.spent, 0);
  const investment = clampInvestment(spentCapped, campaign.totalInvestment);

  const counts: Record<PaceStatus, number> = { acima: 0, "no-ritmo": 0, abaixo: 0 };
  for (const s of withData) {
    counts[s.paceStatus] += 1;
  }

  const totals = { impressions: 0, clicks: 0, views: 0, listens: 0, sent: 0 };
  for (const s of withData) {
    const c = s.complementary;
    if (!c) {
      continue;
    }
    switch (c.strategy) {
      case "alcance":
      case "trafego":
        totals.impressions += c.impressions;
        totals.clicks += c.clicks;
        break;
      case "visualizacoes":
        totals.impressions += c.impressions;
        totals.views += c.views;
        totals.clicks += sum(s.daily, "clicks");
        break;
      case "escutas":
        totals.listens += c.listens;
        totals.impressions += c.impressions;
        totals.clicks += c.clicks;
        break;
      case "disparos":
        totals.sent += c.sent;
        totals.clicks += c.clicks;
        break;
    }
  }

  return {
    campaign,
    totalInvestment: campaign.totalInvestment,
    spentRaw: Math.round(spentRaw * 100) / 100,
    spent: investment.spent,
    investmentProgress: investment.progress,
    investmentComplete: investment.complete,
    expectedProgress: calendar.expectedProgress,
    daysElapsed: calendar.daysElapsed,
    daysTotal: calendar.daysTotal,
    daysRemaining: calendar.daysRemaining,
    lines: lineSummaries,
    counts,
    lastUpdated,
    withoutData: lineSummaries.length - withData.length,
    totals,
  };
}

/* ------------------------- Séries para os gráficos ------------------------ */

export interface DailySpendRow extends Record<string, unknown> {
  date: Date;
}

/**
 * Gasto diário por linha (uma coluna por linha), para o gráfico empilhado.
 * Datas = união das datas de todas as linhas com dados; sem dado no dia = 0.
 */
export function dailySpendByLine(datasets: Datasets): DailySpendRow[] {
  const withData = lines.filter((l) => {
    const status = datasets[l.id].status;
    return status === "live";
  });
  const byDate = new Map<string, Map<LineId, number>>();
  for (const line of withData) {
    for (const row of datasets[line.id].rows) {
      const bucket = byDate.get(row.date) ?? new Map<LineId, number>();
      bucket.set(line.id, (bucket.get(line.id) ?? 0) + row.spend);
      byDate.set(row.date, bucket);
    }
  }
  return [...byDate.keys()].sort().map((date) => {
    const bucket = byDate.get(date)!;
    const row: DailySpendRow = { date: new Date(`${date}T12:00:00Z`) };
    for (const line of withData) {
      row[line.id] = Math.round((bucket.get(line.id) ?? 0) * 100) / 100;
    }
    return row;
  });
}

/** Linhas que têm dados (para legendas e séries dos gráficos gerais). */
export function linesWithData(datasets: Datasets) {
  return lines.filter((l) => {
    const status = datasets[l.id].status;
    return status === "live";
  });
}

/** Investimento por estratégia (contratado e gasto exibido, já travado por linha). */
export function investmentByStrategy(datasets: Datasets) {
  const summary = getCampaignSummary(datasets);
  const map = new Map<string, { contracted: number; spent: number }>();
  for (const s of summary.lines) {
    const current = map.get(s.line.strategy) ?? { contracted: 0, spent: 0 };
    current.contracted += s.line.investment;
    current.spent += s.spent;
    map.set(s.line.strategy, current);
  }
  return Array.from(map.entries()).map(([strategyId, v]) => ({
    strategy: strategies[strategyId as keyof typeof strategies],
    ...v,
  }));
}

/**
 * Série acumulada da linha: entregue vs. meta esperada até o fim de cada dia,
 * com gasto acumulado travado no contratado.
 */
export function lineCumulative(lineId: LineId, datasets: Datasets) {
  const line = lineById[lineId];
  const dataset = datasets[lineId];
  const rows = dataset.status === "live" ? dataset.rows : [];
  let cumDelivered = 0;
  let cumSpend = 0;
  let cumClicks = 0;
  return rows.map((row) => {
    cumDelivered += row.delivered;
    cumSpend += row.spend;
    cumClicks += row.clicks;
    const endOfDay = Date.parse(`${row.date}T23:59:59-03:00`);
    return {
      date: new Date(`${row.date}T12:00:00Z`),
      entregue: cumDelivered,
      meta: Math.round(line.contractedMetric * expectedFraction(dataset, endOfDay)),
      gasto: Math.min(Math.round(cumSpend * 100) / 100, line.investment),
      diario: row.delivered,
      gastoDia: row.spend,
      cliquesDia: row.clicks,
      cliques: cumClicks,
      impressoesDia: row.impressions,
    };
  });
}

/* --------------------------- Linha do tempo (Gantt) ------------------------ */

export interface TimelineSegment {
  /** yyyy-mm-dd (inclusive). */
  start: string;
  end: string;
  /** Investimento no período (já convertido pela margem). */
  spend: number;
  delivered: number;
}

export interface TimelineRow {
  id: LineId;
  name: string;
  hint: string;
  color: string;
  metricLabel: string;
  hasData: boolean;
  /** Período programado (datas no fuso da Bahia). */
  flight: { start: string; end: string } | null;
  segments: TimelineSegment[];
}

const dayAfter = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

/**
 * Uma linha por plataforma: períodos com investimento viram barras
 * (dias consecutivos com gasto > 0 formam um único segmento).
 */
export function investmentTimeline(datasets: Datasets): TimelineRow[] {
  return lines.map((line) => {
    const dataset = datasets[line.id];
    const hasData = dataset.status === "live";
    const segments: TimelineSegment[] = [];
    for (const row of hasData ? dataset.rows : []) {
      if (row.spend <= 0) {
        continue;
      }
      const last = segments.at(-1);
      if (last && dayAfter(last.end) === row.date) {
        last.end = row.date;
        last.spend += row.spend;
        last.delivered += row.delivered;
      } else {
        segments.push({ start: row.date, end: row.date, spend: row.spend, delivered: row.delivered });
      }
    }
    const flight = dataset.flight
      ? { start: bahiaDate(Date.parse(dataset.flight.start)), end: bahiaDate(Date.parse(dataset.flight.end)) }
      : null;
    return {
      id: line.id,
      name: line.shortName,
      hint: line.navHint === null ? strategies[line.strategy].label : line.channel,
      color: line.color,
      metricLabel: strategies[line.strategy].metricLabel,
      hasData,
      flight,
      segments,
    };
  });
}
