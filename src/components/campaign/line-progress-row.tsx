import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { LineSummary } from "@/data/types";
import { formatCurrencyInt, formatInt, formatPercent, formatUnitCost } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NoDataNotice } from "./no-data-notice";
import { GoalBadge, PaceBadge } from "./pace-badge";
import { SourceBadge } from "./source-badge";
import { ProgressBar } from "./progress-bar";

/** Linha compacta do progresso por plataforma (lista rolável da visão geral). */
export function LineProgressRow({ summary, className }: { summary: LineSummary; className?: string }) {
  const { line, strategy } = summary;
  const hasCost =
    strategy.unitCostLabel && summary.realizedUnitCost !== null && line.contractedUnitCost !== null;
  const delta = hasCost ? summary.realizedUnitCost! / line.contractedUnitCost! - 1 : 0;

  return (
    <Link
      className={cn(
        "group relative grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted",
        className
      )}
      href={`/linhas/${line.id}`}
    >
      <span
        className="mt-0.5 flex size-7 items-center justify-center rounded-full font-heading text-xs font-extrabold text-white"
        style={{ backgroundColor: line.color }}
      >
        {line.order}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <p className="min-w-0 truncate font-heading text-sm font-extrabold tracking-tight">
            {line.name}
            <span className="ml-1.5 font-sans text-[11px] font-medium text-muted-foreground">
              {line.channel} · {strategy.label}
            </span>
          </p>
          <span className="flex flex-wrap items-center gap-1">
            <SourceBadge source={summary.source} status={summary.status} />
            {summary.hasData && summary.goalReached ? <GoalBadge /> : null}
            {summary.hasData ? <PaceBadge status={summary.paceStatus} /> : null}
            <ArrowUpRight aria-hidden className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </span>
        </div>
        {summary.hasData ? (
        <div className="mt-1.5 grid gap-y-1.5">
          <ProgressBar
            color={line.color}
            expected={summary.expectedProgress}
            label={`${formatInt(summary.delivered)} de ${formatInt(line.contractedMetric)} ${strategy.metricLabel}`}
            progress={summary.metricProgress}
            size="sm"
            variant="metric"
          />
          <ProgressBar
            color="var(--brand-navy)"
            complete={summary.investmentComplete}
            label={`${formatCurrencyInt(summary.spent)} de ${formatCurrencyInt(line.investment)}`}
            progress={summary.investmentProgress}
            size="sm"
            valueLabel={
              hasCost
                ? `${strategy.unitCostLabel} ${formatUnitCost(summary.realizedUnitCost!)} · ${delta > 0 ? "+" : ""}${formatPercent(delta, 1)}`
                : undefined
            }
            variant="investment"
          />
        </div>
        ) : (
          <NoDataNotice className="mt-1.5" compact message={summary.message} />
        )}
      </div>
    </Link>
  );
}
