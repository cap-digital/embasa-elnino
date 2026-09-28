"use client";

import { curveMonotoneX } from "@visx/curve";
import { Area } from "@/components/charts/area";
import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { ComposedChart } from "@/components/charts/composed-chart";
import { Grid } from "@/components/charts/grid";
import { Line } from "@/components/charts/line";
import { Ring } from "@/components/charts/ring";
import { RingChart } from "@/components/charts/ring-chart";
import { SeriesBar } from "@/components/charts/series-bar";
import { ChartTooltip } from "@/components/charts/tooltip";
import { BarValueLabels, ValueLabels } from "@/components/charts/value-labels";
import { XAxis } from "@/components/charts/x-axis";
import { YAxis } from "@/components/charts/y-axis";
import { CHART_FILL } from "@/lib/chart";
import type { RetentionStep } from "@/lib/retention";
import {
  formatCompact,
  formatCurrency,
  formatCurrencyCompact,
  formatInt,
  formatPercent,
} from "@/lib/format";

export interface CumulativeRow extends Record<string, unknown> {
  date: Date;
  entregue: number;
  meta: number;
  gasto: number;
  diario: number;
  gastoDia: number;
  cliquesDia: number;
  cliques: number;
  impressoesDia: number;
}

/** Entrega diária da métrica contratada. */
export function DailyDeliveryChart({
  data,
  color,
  metricLabel,
}: {
  data: CumulativeRow[];
  color: string;
  metricLabel: string;
}) {
  return (
    <ComposedChart
      aspectRatio=""
      className={CHART_FILL}
      data={data}
      margin={{ top: 12, right: 28, bottom: 36, left: 52 }}
      maxBarSize={14}
    >
      <Grid horizontal strokeDasharray="0" />
      <SeriesBar dataKey="diario" fill={color} radius={2} />
      <ValueLabels format={formatCompact} mode="bar" valueKey="diario" />
      <YAxis formatValue={formatCompact} numTicks={4} />
      <XAxis numTicks={6} />
      <ChartTooltip
        rows={(p) => [
          { color, label: `${metricLabel} no dia`, value: formatInt(p.diario as number) },
          { color: "var(--muted-foreground)", label: "Acumulado", value: formatInt(p.entregue as number) },
        ]}
        showDots={false}
      />
    </ComposedChart>
  );
}

/** Investimento diário (gasto bruto por dia). */
export function DailySpendChart({ data, color }: { data: CumulativeRow[]; color: string }) {
  return (
    <ComposedChart
      aspectRatio=""
      className={CHART_FILL}
      data={data}
      margin={{ top: 12, right: 28, bottom: 36, left: 64 }}
    >
      <Grid horizontal strokeDasharray="0" />
      <Area curve={curveMonotoneX} dataKey="gastoDia" fill={color} fillOpacity={0.28} strokeWidth={2} />
      <ValueLabels format={formatCurrencyCompact} valueKey="gastoDia" />
      <YAxis formatValue={formatCurrencyCompact} numTicks={4} />
      <XAxis numTicks={6} />
      <ChartTooltip
        rows={(p) => [
          { color, label: "Gasto no dia", value: formatCurrency(p.gastoDia as number) },
          { color: "var(--muted-foreground)", label: "Gasto acumulado", value: formatCurrency(p.gasto as number) },
        ]}
      />
    </ComposedChart>
  );
}

/** Cliques por dia, com acumulado e CTR do dia no tooltip. */
export function DailyClicksChart({ data, color }: { data: CumulativeRow[]; color: string }) {
  return (
    <ComposedChart
      aspectRatio=""
      className={CHART_FILL}
      data={data}
      margin={{ top: 12, right: 28, bottom: 36, left: 52 }}
    >
      <Grid horizontal strokeDasharray="0" />
      <Area curve={curveMonotoneX} dataKey="cliquesDia" fill={color} fillOpacity={0.28} strokeWidth={2} />
      <ValueLabels format={formatInt} valueKey="cliquesDia" />
      <YAxis formatValue={formatCompact} numTicks={4} />
      <XAxis numTicks={6} />
      <ChartTooltip
        rows={(p) => {
          const clicks = p.cliquesDia as number;
          const impressions = p.impressoesDia as number;
          return [
            { color, label: "Cliques no dia", value: formatInt(clicks) },
            { color: "var(--muted-foreground)", label: "Cliques acumulados", value: formatInt(p.cliques as number) },
            { color: "var(--muted-foreground)", label: "CTR do dia", value: formatPercent(impressions > 0 ? clicks / impressions : 0, 2) },
          ];
        }}
      />
    </ComposedChart>
  );
}

/** Acumulado entregue vs. meta linear (ritmo). */
export function PaceChart({
  data,
  color,
  metricLabel,
}: {
  data: CumulativeRow[];
  color: string;
  metricLabel: string;
}) {
  return (
    <ComposedChart
      aspectRatio=""
      className={CHART_FILL}
      data={data}
      margin={{ top: 12, right: 28, bottom: 36, left: 52 }}
    >
      <Grid horizontal strokeDasharray="0" />
      <Area curve={curveMonotoneX} dataKey="entregue" fill={color} fillOpacity={0.22} strokeWidth={2.5} />
      <Line curve={curveMonotoneX} dashFromIndex={0} dataKey="meta" fadeEdges={false} showHighlight={false} stroke="var(--foreground)" strokeWidth={1.5} />
      <ValueLabels format={formatCompact} valueKey="entregue" />
      <YAxis formatValue={formatCompact} numTicks={4} />
      <XAxis numTicks={6} />
      <ChartTooltip
        rows={(p) => {
          const entregue = p.entregue as number;
          const meta = p.meta as number;
          return [
            { color, label: `${metricLabel} acumuladas`, value: formatInt(entregue) },
            { color: "var(--foreground)", label: "Meta linear até a data", value: formatInt(meta) },
            { color: "var(--muted-foreground)", label: "Ritmo", value: formatPercent(meta > 0 ? entregue / meta : 0, 0) },
          ];
        }}
      />
    </ComposedChart>
  );
}

/** Anéis: entrega vs. meta, ritmo esperado e investimento. */
export function PaceRings({
  metricProgress,
  investmentProgress,
  expectedProgress,
  color,
  metricLabel,
}: {
  metricProgress: number;
  investmentProgress: number;
  expectedProgress: number;
  color: string;
  /** Métrica contratada no plural ("impressões"), para deixar claro do que é o progresso. */
  metricLabel: string;
}) {
  const metric = metricLabel.charAt(0).toUpperCase() + metricLabel.slice(1);
  const items = [
    { label: `${metric} entregues`, value: metricProgress, color },
    { label: `${metric} esperadas até hoje`, value: expectedProgress, color: "var(--foreground)" },
    { label: "Investimento (travado)", value: investmentProgress, color: "var(--brand-navy)" },
  ];
  const data = items.map((item) => ({ ...item, value: Math.min(item.value, 1) * 100, maxValue: 100 }));
  return (
    <div className="flex flex-col items-center gap-3 fit:h-full fit:min-h-0">
      <div className="relative aspect-square h-[150px] fit:h-auto fit:max-h-[170px] fit:min-h-0 fit:flex-1">
        <RingChart className="aspect-auto h-full" data={data} ringGap={5} strokeWidth={11}>
          {data.map((d, i) => (
            <Ring index={i} key={d.label} />
          ))}
        </RingChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-heading text-lg font-extrabold tabular-nums" style={{ color }}>
            {formatPercent(metricProgress, 0)}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">da meta de {metricLabel}</span>
        </div>
      </div>
      <ul className="flex w-full min-w-0 shrink-0 flex-col gap-1.5 text-xs">
        {items.map((item) => (
          <li className="flex items-center gap-2" key={item.label}>
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{item.label}</span>
            <span className="font-heading text-sm font-extrabold tabular-nums">{formatPercent(item.value, 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Retenção por etapa: quartis do vídeo ou funil do áudio. */
export function RetentionChart({ steps, color }: { steps: RetentionStep[]; color: string }) {
  const data = steps.map((step) => ({
    etapa: step.label,
    retencao: Math.round(step.rate * 1000) / 10,
    total: step.count ?? null,
  }));
  return (
    <BarChart
      aspectRatio=""
      barGap={0.35}
      className={CHART_FILL}
      data={data}
      margin={{ top: 12, right: 8, bottom: 36, left: 8 }}
      xDataKey="etapa"
    >
      <Grid horizontal strokeDasharray="0" />
      <Bar dataKey="retencao" fill={color} lineCap={4} />
      <BarValueLabels format={(v) => formatPercent(v / 100, 0)} valueKey="retencao" />
      <BarXAxis showAllLabels />
      <ChartTooltip
        rows={(p) => [
          { color, label: `Retenção em ${String(p.etapa).toLowerCase()}`, value: formatPercent((p.retencao as number) / 100, 1) },
          ...(typeof p.total === "number"
            ? [{ color: "var(--muted-foreground)", label: "Total", value: formatInt(p.total) }]
            : []),
        ]}
        showCrosshair={false}
        showDatePill={false}
        showDots={false}
      />
    </BarChart>
  );
}
