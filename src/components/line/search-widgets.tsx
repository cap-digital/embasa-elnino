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
 * Cliques × CTR × CPC por dia, em três painéis com o mesmo eixo de datas
 * (escalas diferentes não dividem um eixo). CPC contratado como referência.
 */
export function SearchDailyTrio({
  rows,
  color,
  contractedCpc,
}: {
  rows: DailyRow[];
  color: string;
  contractedCpc: number | null;
}) {
  const withData = rows.filter((r) => r.impressions > 0);
  if (withData.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
        <Hourglass aria-hidden className="size-5" />
        <p className="max-w-xs text-xs">
          Cliques, CTR e CPC por dia aparecem aqui assim que a campanha registrar as primeiras impressões.
        </p>
      </div>
    );
  }
  const data = rows.map((r) => ({
    date: new Date(`${r.date}T12:00:00Z`),
    cliques: r.delivered,
    ctr: r.impressions > 0 ? (r.delivered / r.impressions) * 100 : 0,
    cpc: r.delivered > 0 ? r.spend / r.delivered : 0,
    cpcContratado: contractedCpc ?? 0,
  }));
  const margin = { top: 8, right: 28, bottom: 8, left: 56 };
  const panel = "h-[120px] w-full fit:h-auto fit:min-h-0 fit:flex-1";

  return (
    <div className="flex h-full flex-col gap-1">
      <PanelLabel color={color} label="Cliques" />
      <ComposedChart aspectRatio="" className={panel} data={data} margin={margin} maxBarSize={22}>
        <Grid horizontal strokeDasharray="0" />
        <SeriesBar dataKey="cliques" fill={color} radius={3} />
        <YAxis formatValue={formatCompact} numTicks={3} />
        <ChartTooltip rows={(p) => [{ color, label: "Cliques", value: formatInt(p.cliques as number) }]} showDots={false} />
      </ComposedChart>

      <PanelLabel color="var(--brand-cyan)" label="CTR" />
      <ComposedChart aspectRatio="" className={panel} data={data} margin={margin}>
        <Grid horizontal strokeDasharray="0" />
        <Line curve={curveMonotoneX} dataKey="ctr" fadeEdges={false} stroke="var(--brand-cyan)" strokeWidth={2.5} />
        <YAxis formatValue={(v) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`} numTicks={3} />
        <ChartTooltip rows={(p) => [{ color: "var(--brand-cyan)", label: "CTR", value: formatPercent((p.ctr as number) / 100, 2) }]} />
      </ComposedChart>

      <PanelLabel color="var(--brand-orange)" label="CPC" note={contractedCpc ? `tracejado: contratado ${formatUnitCost(contractedCpc)}` : undefined} />
      <ComposedChart aspectRatio="" className={panel} data={data} margin={{ ...margin, bottom: 36 }}>
        <Grid horizontal strokeDasharray="0" />
        <Line curve={curveMonotoneX} dataKey="cpc" fadeEdges={false} stroke="var(--brand-orange)" strokeWidth={2.5} />
        {contractedCpc ? (
          <Line dashFromIndex={0} dataKey="cpcContratado" fadeEdges={false} showHighlight={false} stroke="var(--muted-foreground)" strokeWidth={1.5} />
        ) : null}
        <YAxis formatValue={(v) => formatUnitCost(v)} numTicks={3} />
        <XAxis numTicks={6} />
        <ChartTooltip
          rows={(p) => [
            { color: "var(--brand-orange)", label: "CPC", value: formatUnitCost(p.cpc as number) },
            ...(contractedCpc ? [{ color: "var(--muted-foreground)", label: "CPC contratado", value: formatUnitCost(contractedCpc) }] : []),
          ]}
        />
      </ComposedChart>
    </div>
  );
}

function PanelLabel({ label, color, note }: { label: string; color: string; note?: string }) {
  return (
    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
      {note ? <span className="font-normal normal-case tracking-normal">· {note}</span> : null}
    </p>
  );
}
