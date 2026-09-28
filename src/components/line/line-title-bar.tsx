import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { DoneBadge, GoalBadge, PaceBadge } from "@/components/campaign/pace-badge";
import type { ContractedLine, LineSummary } from "@/data/types";

export function LineTitleBar({
  summary,
  prev,
  next,
}: {
  summary: LineSummary;
  prev: ContractedLine | null;
  next: ContractedLine | null;
}) {
  const { line, strategy } = summary;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span
          className="flex size-8 items-center justify-center rounded-full font-heading text-xs font-extrabold text-white"
          style={{ backgroundColor: line.color }}
        >
          {line.order}
        </span>
        <h1 className="font-heading text-xl font-black tracking-tight sm:text-2xl">{line.name}</h1>
        <span className="text-xs text-muted-foreground">
          {line.channel} · estratégia {strategy.label}
        </span>
        {summary.hasData ? <PaceBadge status={summary.paceStatus} /> : null}
        {summary.hasData && summary.goalReached ? <GoalBadge /> : null}
        {summary.investmentComplete ? <DoneBadge /> : null}
      </div>
      <nav aria-label="Navegação entre plataformas" className="flex items-center gap-1 text-xs">
        {prev ? (
          <Link className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 font-medium hover:bg-muted" href={`/linhas/${prev.id}`}>
            <ArrowLeft aria-hidden className="size-3.5" /> {prev.shortName}
          </Link>
        ) : null}
        {next ? (
          <Link className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 font-medium hover:bg-muted" href={`/linhas/${next.id}`}>
            {next.shortName} <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
