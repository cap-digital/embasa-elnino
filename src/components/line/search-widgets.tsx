"use client";

import { curveMonotoneX } from "@visx/curve";
import { Hourglass } from "lucide-react";
import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarYAxis } from "@/components/charts/bar-y-axis";
import { ComposedChart } from "@/components/charts/composed-chart";
import { Line } from "@/components/charts/line";
import { SeriesBar } from "@/components/charts/series-bar";
import { XAxis } from "@/components/charts/x-axis";
import { YAxis } from "@/components/charts/y-axis";
import type { DailyRow } from "@/data/types";
import { Gauge } from "@/components/charts/gauge";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip } from "@/components/charts/tooltip";
import { CHART_FILL } from "@/lib/chart";
import { formatCompact, formatInt, formatPercent, formatUnitCost } from "@/lib/format";

/** Termos mais presentes nas palavras-chave (barras horizontais). */
export function KeywordThemesChart({
  themes,
  total,
  color,
}: {
  themes: Array<{ term: string; count: number; clicks: number }>;
  total: number;
  color: string;
}) {
  const data = themes.map((t) => ({ termo: t.term, palavras: t.count, cliques: t.clicks }));
  return (
    <BarChart
      aspectRatio=""
      barGap={0.3}
      className={CHART_FILL}
      data={data}
      margin={{ top: 4, right: 16, bottom: 8, left: 96 }}
      orientation="horizontal"
      xDataKey="termo"
    >
      <Grid horizontal={false} strokeDasharray="0" vertical />
      <Bar dataKey="palavras" fill={color} lineCap={4} />
      <BarYAxis showAllLabels />
      <ChartTooltip
        rows={(p) => [
          { color, label: "Palavras-chave com o termo", value: `${formatInt(p.palavras as number)} de ${formatInt(total)}` },
          { color: "var(--muted-foreground)", label: "Participação", value: formatPercent((p.palavras as number) / Math.max(total, 1), 0) },
          { color: "var(--muted-foreground)", label: "Cliques", value: formatInt(p.cliques as number) },
        ]}
        showCrosshair={false}
        showDatePill={false}
        showDots={false}
      />
    </BarChart>
  );
}

/** Medidor da meta de cliques. */
export function ClicksGauge({ clicks, goal }: { clicks: number; goal: number }) {
  const pct = goal > 0 ? Math.min((clicks / goal) * 100, 100) : 0;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1">
      <Gauge
        centerValue={clicks}
        className="w-full max-w-[220px]"
        minWidth={160}
        defaultLabel={`de ${formatInt(goal)} cliques`}
        formatOptions={{ maximumFractionDigits: 0 }}
        totalNotches={36}
        value={pct}
      />
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{formatPercent(pct / 100, 1)}</span> da meta contratada
      </p>
    </div>
  );
}

/**
 * Cliques × CTR × CPC num único gráfico.
 * Barras: cliques por dia (eixo esquerdo). Linhas: CTR acumulado (eixo direito)
 * e CPC médio acumulado (escala própria, valores no tooltip) — acumulados para
 * nunca "despencar" a zero num dia sem clique, quando o CPC do dia não existe.
 * O gráfico começa no primeiro dia com clique (antes disso não há CPC).
 */
export function SearchDailyCombo({
  rows,
  color,
  contractedCpc,
}: {
  rows: DailyRow[];
  color: string;
  contractedCpc: number | null;
}) {
  const firstClick = rows.findIndex((r) => r.delivered > 0);
  if (firstClick === -1) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
        <Hourglass aria-hidden className="size-5" />
        <p className="max-w-xs text-xs">
          Cliques, CTR e CPC aparecem aqui assim que a campanha registrar os primeiros cliques.
        </p>
      </div>
    );
  }
  const data: Array<{
    date: Date;
    cliques: number;
    impressoes: number;
    ctr: number;
    cpc: number;
    cpcContratado: number;
    ctrDia: number | null;
    cpcDia: number | null;
  }> = [];
  const totals = { clicks: 0, impressions: 0, spend: 0 };
  for (const r of rows) {
    totals.clicks += r.delivered;
    totals.impressions += r.impressions;
    totals.spend += r.spend;
    data.push({
      date: new Date(`${r.date}T12:00:00Z`),
      cliques: r.delivered,
      impressoes: r.impressions,
      ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
      cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
      cpcContratado: contractedCpc ?? 0,
      ctrDia: r.impressions > 0 ? r.delivered / r.impressions : null,
      cpcDia: r.delivered > 0 ? r.spend / r.delivered : null,
    });
  }
  data.splice(0, firstClick);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
          <span className="font-semibold text-foreground">Cliques</span> eixo esquerdo
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-brand-cyan" />
          <span className="font-semibold text-foreground">CTR acumulado</span> eixo direito
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-brand-orange" />
          <span className="font-semibold text-foreground">CPC médio acumulado</span>
          {contractedCpc ? <span>· tracejado: contratado {formatUnitCost(contractedCpc)}</span> : null}
        </li>
        <li className="text-[10px]">Passe o mouse para ver os valores de cada dia.</li>
      </ul>
      <ComposedChart
        aspectRatio=""
        className={CHART_FILL}
        data={data}
        margin={{ top: 12, right: 56, bottom: 36, left: 48 }}
        maxBarSize={36}
        padEdges
      >
        <Grid horizontal strokeDasharray="0" />
        <SeriesBar dataKey="cliques" fill={color} radius={4} />
        <Line curve={curveMonotoneX} dataKey="ctr" fadeEdges={false} showMarkers stroke="var(--brand-cyan)" strokeWidth={2.5} yAxisId="ctr" />
        <Line curve={curveMonotoneX} dataKey="cpc" fadeEdges={false} showMarkers stroke="var(--brand-orange)" strokeWidth={2.5} yAxisId="cpc" />
        {contractedCpc ? (
          <Line dashFromIndex={0} dataKey="cpcContratado" fadeEdges={false} showHighlight={false} stroke="var(--brand-orange)" strokeWidth={1.25} yAxisId="cpc" />
        ) : null}
        <YAxis formatValue={formatCompact} numTicks={4} />
        <YAxis
          formatValue={(v) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
          numTicks={4}
          orientation="right"
          yAxisId="ctr"
        />
        <XAxis numTicks={6} />
        <ChartTooltip
          rows={(p) => [
            { color, label: "Cliques", value: formatInt(p.cliques as number) },
            { color: "var(--brand-cyan)", label: "CTR", value: p.ctrDia === null ? "—" : formatPercent(p.ctrDia as number, 2) },
            { color: "var(--brand-orange)", label: "CPC", value: p.cpcDia === null ? "sem cliques" : formatUnitCost(p.cpcDia as number) },
          ]}
        />
      </ComposedChart>
    </div>
  );
}
