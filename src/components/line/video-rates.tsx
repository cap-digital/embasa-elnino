import type { LineSummary, VisualizacoesMetrics } from "@/data/types";
import { formatPercent, formatUnitCost } from "@/lib/format";
import { videoRetentionSteps } from "@/lib/retention";
import { cn } from "@/lib/utils";
import { RetentionChart } from "./line-charts";

interface Rate {
  label: string;
  value: string;
  /** 0–1 para a barra; omitido quando não é uma taxa. */
  bar?: number;
  hint: string;
  tone?: "good" | "warn";
}

/** Painel de taxas do vídeo + retenção por quartil. */
export function VideoRates({ summary, metrics }: { summary: LineSummary; metrics: VisualizacoesMetrics }) {
  const { line } = summary;
  const clicks = summary.daily.reduce((acc, r) => acc + r.clicks, 0);
  const ctr = metrics.impressions > 0 ? clicks / metrics.impressions : 0;
  const cpm = metrics.impressions > 0 ? (summary.spentRaw / metrics.impressions) * 1000 : 0;
  const cpvDelta = line.contractedUnitCost ? metrics.cpv / line.contractedUnitCost - 1 : 0;

  const rates: Rate[] = [
    { label: "Taxa de visualização (VTR)", value: formatPercent(metrics.vtr, 1), bar: metrics.vtr, hint: "visualizações ÷ impressões" },
    { label: "Assistiram até o fim", value: formatPercent(metrics.quartiles.q100, 1), bar: metrics.quartiles.q100, hint: "impressões que chegaram a 100%" },
    { label: "CTR", value: formatPercent(ctr, 2), bar: Math.min(ctr * 20, 1), hint: "cliques ÷ impressões" },
    {
      label: "CPV",
      value: formatUnitCost(metrics.cpv),
      hint: `contratado ${line.contractedUnitCost !== null ? formatUnitCost(line.contractedUnitCost) : "—"} · ${cpvDelta > 0 ? "+" : ""}${formatPercent(cpvDelta, 1)}`,
      tone: cpvDelta <= 0 ? "good" : "warn",
    },
    { label: "CPM", value: formatUnitCost(cpm), hint: "custo por mil impressões" },
  ];

  return (
    <div className="grid h-full gap-4 @lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <ul className="flex min-w-0 flex-col gap-2 pt-0.5 fit:min-h-0 fit:overflow-y-auto">
        {rates.map((rate) => (
          <li key={rate.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-xs text-muted-foreground">{rate.label}</span>
              <span
                className={cn(
                  "shrink-0 font-heading text-base font-extrabold tabular-nums",
                  rate.tone === "good" && "text-status-good-foreground",
                  rate.tone === "warn" && "text-status-warn-foreground"
                )}
                style={rate.tone ? undefined : { color: line.color }}
              >
                {rate.value}
              </span>
            </div>
            {rate.bar !== undefined ? (
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${Math.min(rate.bar, 1) * 100}%`, backgroundColor: line.color }} />
              </div>
            ) : null}
            <p className="mt-0.5 text-[10px] text-muted-foreground">{rate.hint}</p>
          </li>
        ))}
      </ul>
      <div className="flex min-h-[220px] min-w-0 flex-col fit:min-h-0">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Retenção por quartil
        </p>
        <div className="min-h-0 flex-1">
          <RetentionChart color={line.color} steps={videoRetentionSteps(metrics.quartiles)} />
        </div>
      </div>
    </div>
  );
}
