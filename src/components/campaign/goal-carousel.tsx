"use client";

import { ArrowUpRight, ChevronLeft, ChevronRight, LayoutGrid, Rows3 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { LineSummary } from "@/data/types";
import {
  formatCurrencyInt,
  formatDeltaPp,
  formatInt,
  formatPercent,
  formatProgress,
  formatUnitCost,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { LineGoalCard } from "./line-goal-card";
import { NoDataNotice } from "./no-data-notice";
import { GoalRace } from "./goal-race";
import { GoalBadge, PaceBadge } from "./pace-badge";
import { ProgressBar } from "./progress-bar";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Progresso por plataforma em carrossel: um card grande em destaque,
 * vizinhos parcialmente visíveis, setas nas laterais e "Ver todas" (grade).
 */
export function GoalCarousel({ summaries }: { summaries: LineSummary[] }) {
  const [index, setIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const total = summaries.length;
  const go = useCallback((delta: number) => setIndex((i) => (i + delta + total) % total), [total]);

  // Setas do teclado quando o carrossel está visível.
  useEffect(() => {
    if (showAll) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) {
        return;
      }
      if (event.key === "ArrowRight") {
        go(1);
      } else if (event.key === "ArrowLeft") {
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, showAll]);

  const prev = summaries[(index - 1 + total) % total];
  const current = summaries[index];
  const next = summaries[(index + 1) % total];

  return (
    <section aria-label="Progresso por plataforma" className="flex min-w-0 flex-col gap-3 fit:h-full fit:min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="font-heading text-base font-extrabold tracking-tight">Progresso por plataforma</h2>
          {!showAll ? (
            <span className="text-xs font-medium tabular-nums tracking-[0.2em] text-muted-foreground">
              {pad(index + 1)} / {pad(total)}
            </span>
          ) : null}
        </div>
        <button
          aria-pressed={showAll}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors hover:bg-muted"
          onClick={() => setShowAll((v) => !v)}
          type="button"
        >
          {showAll ? <Rows3 aria-hidden className="size-3.5" /> : <LayoutGrid aria-hidden className="size-3.5" />}
          {showAll ? "Ver em destaque" : "Ver todas"}
        </button>
      </div>

      {showAll ? (
        <div className="rounded-2xl fit:-m-1 fit:min-h-0 fit:flex-1 fit:overflow-y-auto fit:p-1">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            {summaries.map((s) => (
              <LineGoalCard key={s.line.id} summary={s} />
            ))}
          </div>
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1 items-stretch gap-4">
          {/* Vizinho anterior (parcialmente visível) */}
          <button
            aria-label={`Anterior: ${prev.line.name}`}
            className="hidden w-[14%] shrink-0 overflow-hidden rounded-3xl border border-border bg-card/70 text-left opacity-50 shadow-sm transition-opacity hover:opacity-80 lg:block"
            onClick={() => go(-1)}
            type="button"
          >
            <PeekCard align="right" summary={prev} />
          </button>

          <div className="relative min-w-0 flex-1">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className="h-full"
                exit={{ opacity: 0, x: -24 }}
                initial={{ opacity: 0, x: 24 }}
                key={current.line.id}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <SpotlightCard position={`${pad(index + 1)} / ${pad(total)}`} summary={current} />
              </motion.div>
            </AnimatePresence>

            {/* Setas nas laterais */}
            <button
              aria-label="Plataforma anterior"
              className="absolute top-1/2 left-0 z-10 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-md transition-colors hover:bg-brand-blue hover:text-white"
              onClick={() => go(-1)}
              type="button"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <button
              aria-label="Próxima plataforma"
              className="absolute top-1/2 right-0 z-10 flex size-10 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-md transition-colors hover:bg-brand-blue hover:text-white"
              onClick={() => go(1)}
              type="button"
            >
              <ChevronRight aria-hidden className="size-5" />
            </button>
          </div>

          {/* Vizinho seguinte (parcialmente visível) */}
          <button
            aria-label={`Próxima: ${next.line.name}`}
            className="hidden w-[14%] shrink-0 overflow-hidden rounded-3xl border border-border bg-card/70 text-left opacity-50 shadow-sm transition-opacity hover:opacity-80 lg:block"
            onClick={() => go(1)}
            type="button"
          >
            <PeekCard align="left" summary={next} />
          </button>
        </div>
      )}

      {!showAll ? (
        <div aria-label="Escolher plataforma" className="flex flex-wrap justify-center gap-1.5" role="tablist">
          {summaries.map((s, i) => (
            <button
              aria-label={s.line.name}
              aria-selected={i === index}
              className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6" : "w-1.5 bg-border hover:bg-muted-foreground")}
              key={s.line.id}
              onClick={() => setIndex(i)}
              role="tab"
              style={i === index ? { backgroundColor: s.line.color } : undefined}
              type="button"
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PeekCard({ summary, align }: { summary: LineSummary; align: "left" | "right" }) {
  return (
    <div className={cn("flex h-full flex-col justify-center gap-2 p-5", align === "right" ? "items-end text-right" : "items-start")}>
      <span className="size-3 rounded-full" style={{ backgroundColor: summary.line.color }} />
      <p className="font-heading text-lg font-extrabold leading-tight">{summary.line.shortName}</p>
      <p className="text-xs text-muted-foreground">
        {summary.hasData ? `${formatProgress(summary.metricProgress)} da meta` : "sem dados"}
      </p>
    </div>
  );
}

function SpotlightCard({ summary, position }: { summary: LineSummary; position: string }) {
  const { line, strategy } = summary;
  const hasCost =
    strategy.unitCostLabel && summary.realizedUnitCost !== null && line.contractedUnitCost !== null;
  const costDelta = hasCost ? summary.realizedUnitCost! / line.contractedUnitCost! - 1 : 0;

  return (
    <article
      className="relative flex h-full min-h-[440px] flex-col gap-5 overflow-hidden rounded-3xl border bg-card p-6 shadow-sm sm:p-8 fit:min-h-0"
      style={{ borderColor: `color-mix(in oklab, ${line.color} 45%, var(--border))` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full opacity-15 blur-3xl"
        style={{ backgroundColor: line.color }}
      />

      <header className="relative flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {line.channel} · {strategy.label}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {summary.hasData ? <PaceBadge size="md" status={summary.paceStatus} /> : null}
          {summary.hasData && summary.goalReached ? <GoalBadge /> : null}
        </div>
      </header>

      <div className="relative">
        <p className="text-xs font-medium tabular-nums tracking-[0.2em] text-muted-foreground">{position}</p>
        <h3 className="mt-1 flex items-center gap-3 font-heading text-3xl font-black leading-tight tracking-tight sm:text-4xl">
          <span className="size-3.5 shrink-0 rounded-full" style={{ backgroundColor: line.color }} />
          {line.name}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {summary.hasData
            ? `${formatInt(summary.delivered)} de ${formatInt(line.contractedMetric)} ${strategy.metricLabel} · esperado ${formatProgress(summary.expectedProgress)} para a data (${formatDeltaPp(summary.paceDelta)})`
            : `Meta contratada: ${formatInt(line.contractedMetric)} ${strategy.metricLabel} · ${formatCurrencyInt(line.investment)}`}
        </p>
      </div>

      {summary.hasData ? (
        <div className="relative flex flex-col gap-4">
          <ProgressBar
            color="var(--brand-navy)"
            complete={summary.investmentComplete}
            label={`Investimento · ${formatCurrencyInt(summary.spent)} de ${formatCurrencyInt(line.investment)}`}
            progress={summary.investmentProgress}
            size="lg"
            variant="investment"
          />
        </div>
      ) : (
        <NoDataNotice className="relative" compact message={summary.message} />
      )}

      {summary.hasData ? <GoalRace summary={summary} /> : null}

      <footer className="relative mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {hasCost ? `${strategy.unitCostLabel} realizado` : "Investimento contratado"}
          </p>
          <p className="font-heading text-3xl font-black tabular-nums tracking-tight">
            {hasCost ? formatUnitCost(summary.realizedUnitCost!) : formatCurrencyInt(line.investment)}
          </p>
          {hasCost ? (
            <p className="text-xs text-muted-foreground">
              contratado {formatUnitCost(line.contractedUnitCost!)} ·{" "}
              <span className={costDelta <= 0 ? "font-semibold text-status-good-foreground" : "font-semibold text-status-warn-foreground"}>
                {costDelta > 0 ? "+" : ""}
                {formatPercent(costDelta, 1)}
              </span>
            </p>
          ) : null}
        </div>
        <Link
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition-colors hover:bg-brand-blue"
          href={`/linhas/${line.id}`}
        >
          Ver página da plataforma <ArrowUpRight aria-hidden className="size-3.5" />
        </Link>
      </footer>
    </article>
  );
}
