import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { LineSummary } from "@/data/types";
import { formatCurrencyInt, formatInt, formatPercent, formatUnitCost } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NoDataNotice } from "./no-data-notice";
import { GoalBadge, PaceBadge } from "./pace-badge";
import { ProgressBar } from "./progress-bar";

/** Cartão de meta por linha: duas barras (métrica e investimento) + custo unitário. */
export function LineGoalCard({ summary, className }: { summary: LineSummary; className?: string }) {
  const { line, strategy } = summary;
  const hasCost =
    strategy.unitCostLabel && summary.realizedUnitCost !== null && line.contractedUnitCost !== null;
  const delta = hasCost ? summary.realizedUnitCost! / line.contractedUnitCost! - 1 : 0;
  const tone = delta <= -0.005 ? "good" : delta >= 0.005 ? "warn" : "neutral";

  return (
    <article
      className={cn(
        "group relative flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
      style={{ borderTopColor: line.color, borderTopWidth: 3 }}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-full font-heading text-xs font-extrabold text-white"
            style={{ backgroundColor: line.color }}
          >
            {line.order}
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-heading text-sm font-extrabold leading-tight tracking-tight">
              <Link className="after:absolute after:inset-0" href={`/linhas/${line.id}`}>
                {line.name}
              </Link>
            </h3>
            <p className="truncate text-[11px] text-muted-foreground">
              {line.channel} · {strategy.label}
            </p>
          </div>
        </div>
        <ArrowUpRight aria-hidden className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </header>

      <div className="flex flex-wrap items-center gap-1">
        {summary.hasData ? <PaceBadge status={summary.paceStatus} /> : null}
        {summary.hasData && summary.goalReached ? <GoalBadge /> : null}
      </div>

      {summary.hasData ? (
        <>

      <div className="flex items-end justify-between gap-2">
        <p className="font-heading text-2xl font-extrabold leading-none tabular-nums tracking-tight" style={{ color: line.color }}>
          {formatInt(summary.delivered)}
        </p>
        <p className="text-right text-[11px] leading-tight text-muted-foreground">
          de <span className="font-semibold text-foreground">{formatInt(line.contractedMetric)}</span>
          <br />
          {strategy.metricLabel}
        </p>
      </div>

      <ProgressBar
        color={line.color}
        expected={summary.expectedProgress}
        label="Métrica contratada"
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
        variant="investment"
      />

      <footer className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2 text-[11px]">
        {hasCost ? (
          <>
            <span className="text-muted-foreground">
              {strategy.unitCostLabel}{" "}
              <span className="font-heading text-sm font-extrabold text-foreground">{formatUnitCost(summary.realizedUnitCost!)}</span>{" "}
              vs. {formatUnitCost(line.contractedUnitCost!)}
            </span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 font-semibold tabular-nums",
                tone === "good" && "bg-status-good text-status-good-foreground",
                tone === "warn" && "bg-status-warn text-status-warn-foreground",
                tone === "neutral" && "bg-status-neutral text-status-neutral-foreground"
              )}
            >
              {delta > 0 ? "+" : ""}
              {formatPercent(delta, 1)}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">
            Custo por disparo{" "}
            <span className="font-heading text-sm font-extrabold text-foreground">
              {formatUnitCost(summary.spentRaw / Math.max(summary.delivered, 1))}
            </span>
          </span>
        )}
      </footer>
        </>
      ) : (
        <>
          <p className="text-[11px] text-muted-foreground">
            Meta contratada: <span className="font-semibold text-foreground">{formatInt(line.contractedMetric)}</span>{" "}
            {strategy.metricLabel} · {formatCurrencyInt(line.investment)}
          </p>
          <NoDataNotice className="mt-auto" compact message={summary.message} />
        </>
      )}
    </article>
  );
}
