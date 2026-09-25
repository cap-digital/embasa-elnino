"use client";

import { Flag, Gauge, Hourglass, Rabbit, Turtle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { LineSummary } from "@/data/types";
import { formatCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;

/**
 * "Corrida até a meta": a plataforma corre numa pista até a bandeira (100%).
 * Fantasma = onde deveria estar hoje; pontilhado = projeção linear no ritmo atual.
 * Tudo calculado com os dados reais da linha.
 */
export function GoalRace({ summary }: { summary: LineSummary }) {
  const reduced = useReducedMotion();
  const { line, strategy } = summary;
  const color = line.color;

  const start = summary.flight ? Date.parse(summary.flight.start) : null;
  const end = summary.flight ? Date.parse(summary.flight.end) : null;
  // Referência = momento da busca na API (determinístico entre servidor e cliente).
  const now = summary.fetchedAt ? Date.parse(summary.fetchedAt) : null;
  const totalDays = start && end ? (end - start) / DAY_MS : null;
  const elapsedDays =
    start && end && now !== null ? Math.min(Math.max((now - start) / DAY_MS, 0), totalDays!) : null;
  const remainingDays = totalDays !== null && elapsedDays !== null ? Math.max(totalDays - elapsedDays, 0) : null;

  const actual = summary.metricProgress;
  const expected = summary.expectedProgress;
  const projected = expected > 0.02 ? actual / expected : null;
  const perDayNow = elapsedDays && elapsedDays > 0.25 ? summary.delivered / elapsedDays : null;
  const missing = Math.max(line.contractedMetric - summary.delivered, 0);
  const perDayNeeded = remainingDays && remainingDays > 0 ? missing / remainingDays : null;
  const speedup = perDayNow && perDayNeeded ? perDayNeeded / perDayNow : null;

  // Escala da pista: até 100% ou até a projeção, se passar da meta.
  const scaleMax = Math.max(1, projected ?? 0, actual) * 1.04;
  const x = (v: number) => `${(Math.min(v, scaleMax) / scaleMax) * 100}%`;
  const verdictGood = projected !== null && projected >= 1;

  const transition = reduced ? { duration: 0 } : { duration: 1.4, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div className="relative flex flex-col gap-5">
      {/* Pista */}
      <div className="relative mx-6 pt-9 pb-7">
        {/* trilha */}
        <div className="relative h-3 rounded-full bg-[repeating-linear-gradient(90deg,var(--muted)_0_14px,color-mix(in_oklab,var(--muted)_40%,var(--card))_14px_28px)]">
          {/* rastro percorrido */}
          <motion.div
            animate={{ width: x(actual) }}
            className="absolute inset-y-0 left-0 rounded-full"
            initial={{ width: 0 }}
            style={{ background: `linear-gradient(90deg, color-mix(in oklab, ${color} 25%, transparent), ${color})` }}
            transition={transition}
          />
          {/* projeção */}
          {projected !== null ? (
            <motion.div
              animate={{ left: x(actual), width: `calc(${x(projected)} - ${x(actual)})` }}
              className="absolute top-1/2 h-0 -translate-y-1/2 border-t-2 border-dotted"
              initial={{ left: 0, width: 0 }}
              style={{ borderColor: color, opacity: 0.6 }}
              transition={{ ...transition, delay: reduced ? 0 : 0.9 }}
            />
          ) : null}
        </div>

        {/* bandeira de chegada (100%) */}
        <div className="absolute top-0 bottom-0 flex flex-col items-center" style={{ left: x(1), transform: "translateX(-50%)" }}>
          <Flag aria-hidden className="size-5 text-foreground" />
          <span className="w-0.5 flex-1 bg-[repeating-linear-gradient(180deg,var(--foreground)_0_4px,transparent_4px_8px)]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">meta</span>
        </div>

        {/* fantasma: onde deveria estar hoje */}
        {expected > 0 ? (
          <div className="absolute top-0 flex flex-col items-center" style={{ left: x(expected), transform: "translateX(-50%)" }}>
            <span className="mb-1 whitespace-nowrap text-[10px] text-muted-foreground">esperado {formatPercent(expected, 0)}</span>
            <span className="size-5 rounded-full border-2 border-dashed border-muted-foreground/70 bg-card/60" />
          </div>
        ) : null}

        {/* corredor */}
        <motion.div
          animate={{ left: x(actual) }}
          className="absolute top-5 flex -translate-x-1/2 flex-col items-center"
          initial={{ left: "0%" }}
          transition={transition}
        >
          <span className="relative flex size-7 items-center justify-center">
            {!reduced ? (
              <span className="absolute inset-0 animate-ping rounded-full opacity-30" style={{ backgroundColor: color }} />
            ) : null}
            <span className="relative size-7 rounded-full border-[3px] border-card shadow-md" style={{ backgroundColor: color }} />
          </span>
          <span className="mt-3.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ backgroundColor: color }}>
            {formatPercent(actual, 0)}
          </span>
        </motion.div>

        {/* ponto projetado */}
        {projected !== null ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="absolute top-6 flex -translate-x-1/2 flex-col items-center"
            initial={{ opacity: 0 }}
            style={{ left: x(projected) }}
            transition={{ duration: 0.4, delay: reduced ? 0 : 1.8 }}
          >
            <span className="size-5 rounded-full border-2 border-dotted" style={{ borderColor: color }} />
            <span className="mt-4 whitespace-nowrap text-[10px] font-semibold" style={{ color }}>
              projeção {formatPercent(projected, 0)}
            </span>
          </motion.div>
        ) : null}
      </div>

      {/* Veredito */}
      <p
        className={cn(
          "flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold",
          projected === null
            ? "bg-muted text-muted-foreground"
            : verdictGood
              ? "bg-status-good text-status-good-foreground"
              : "bg-status-warn text-status-warn-foreground"
        )}
      >
        {projected === null ? (
          <Hourglass aria-hidden className="size-4 shrink-0" />
        ) : verdictGood ? (
          <Rabbit aria-hidden className="size-4 shrink-0" />
        ) : (
          <Turtle aria-hidden className="size-4 shrink-0" />
        )}
        {projected === null
          ? "Veiculação recém-iniciada: a projeção aparece após as primeiras horas de entrega."
          : verdictGood
            ? `No ritmo atual, fecha em ${formatPercent(projected, 0)} da meta de ${strategy.metricLabel}.`
            : `No ritmo atual, fecha em ${formatPercent(projected, 0)} da meta.${speedup && speedup > 1 ? ` Precisa acelerar ${speedup.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}× para chegar a 100%.` : ""}`}
      </p>

      {/* Contagem regressiva */}
      <dl className="grid grid-cols-3 gap-3">
        <Countdown
          icon={Hourglass}
          label="Faltam"
          value={remainingDays !== null ? `${Math.ceil(remainingDays)} ${Math.ceil(remainingDays) === 1 ? "dia" : "dias"}` : "—"}
        />
        <Countdown
          icon={Flag}
          label={`Necessário / dia`}
          value={perDayNeeded !== null ? formatCompact(Math.ceil(perDayNeeded)) : missing === 0 ? "meta batida" : "—"}
        />
        <Countdown icon={Gauge} label="Ritmo atual / dia" tone={color} value={perDayNow !== null ? formatCompact(Math.round(perDayNow)) : "—"} />
      </dl>
      <p className="-mt-2 text-[10px] text-muted-foreground">
        Projeção linear com base na entrega desde o início da veiculação ({strategy.metricLabel}).
      </p>
    </div>
  );
}

function Countdown({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Flag;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background px-4 py-3">
      <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Icon aria-hidden className="size-3.5" />
        {label}
      </dt>
      <dd className="mt-1 font-heading text-2xl font-black tabular-nums tracking-tight" style={tone ? { color: tone } : undefined}>
        {value}
      </dd>
    </div>
  );
}
