"use client";

import { Flag, Gauge, Hourglass, Rabbit, Turtle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef } from "react";
import type { LineSummary } from "@/data/types";
import { formatCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;
const LABEL_GAP = 6;
/** Largura do ícone da bandeira (size-5). */
const FLAG_WIDTH = 20;
/** Quanto os rótulos podem invadir a margem lateral da pista (mx-6). */
const LABEL_OVERFLOW = 24;

type TrackLabel = { id: string; center: number; width: number; fixed?: boolean };

/**
 * Distribui rótulos numa mesma faixa sem sobreposição: os que colidem viram um
 * grupo lado a lado, centrado na média dos marcadores (ou ancorado no item fixo).
 * Retorna o deslocamento horizontal (px) de cada rótulo em relação ao seu marcador.
 */
function resolveLabels(items: TrackLabel[], min: number, max: number): Record<string, number> {
  const sorted = [...items].sort((a, b) => a.center - b.center || Number(!!a.fixed) - Number(!!b.fixed));
  const span = (g: TrackLabel[]) => g.reduce((s, it) => s + it.width, 0) + LABEL_GAP * (g.length - 1);
  const place = (g: TrackLabel[]) => {
    const fixedIdx = g.findIndex((it) => it.fixed);
    const left =
      fixedIdx >= 0
        ? g[fixedIdx].center - g[fixedIdx].width / 2 - g.slice(0, fixedIdx).reduce((s, it) => s + it.width + LABEL_GAP, 0)
        : g.reduce((s, it) => s + it.center, 0) / g.length - span(g) / 2;
    return Math.min(Math.max(left, min), max - span(g));
  };

  const groups = sorted.map((it) => ({ items: [it], left: place([it]) }));
  for (let i = 1; i < groups.length; ) {
    const prev = groups[i - 1];
    const cur = groups[i];
    if (prev.left + span(prev.items) + LABEL_GAP > cur.left) {
      const items = [...prev.items, ...cur.items];
      groups.splice(i - 1, 2, { items, left: place(items) });
      i = Math.max(i - 1, 1);
    } else {
      i++;
    }
  }

  const out: Record<string, number> = {};
  for (const g of groups) {
    let x = g.left;
    for (const it of g.items) {
      out[it.id] = x + it.width / 2 - it.center;
      x += it.width + LABEL_GAP;
    }
  }
  return out;
}

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
  // Com a veiculação encerrada a projeção coincide com o atual: não repete o marcador.
  const showProjection = projected !== null && Math.round(projected * 100) !== Math.round(actual * 100);

  const trackRef = useRef<HTMLDivElement>(null);
  const expectedLabelRef = useRef<HTMLSpanElement>(null);
  const metaLabelRef = useRef<HTMLSpanElement>(null);
  const actualLabelRef = useRef<HTMLSpanElement>(null);
  const projectedLabelRef = useRef<HTMLSpanElement>(null);

  // Afasta os rótulos que se sobreporiam (posições finais, já com a pista medida).
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const refs = { expected: expectedLabelRef, meta: metaLabelRef, actual: actualLabelRef, projected: projectedLabelRef };
    const run = () => {
      const width = track.clientWidth;
      const px = (v: number) => (Math.min(v, scaleMax) / scaleMax) * width;
      const label = (id: keyof typeof refs, v: number): TrackLabel[] => {
        const el = refs[id].current;
        return el ? [{ id, center: px(v), width: el.offsetWidth }] : [];
      };
      const min = -LABEL_OVERFLOW;
      const max = width + LABEL_OVERFLOW;
      const shifts = {
        ...resolveLabels([...label("expected", expected), { id: "flag", center: px(1), width: FLAG_WIDTH, fixed: true }], min, max),
        ...resolveLabels([...label("meta", 1), ...label("actual", actual), ...label("projected", projected ?? 0)], min, max),
      };
      for (const [id, ref] of Object.entries(refs)) {
        if (ref.current) ref.current.style.translate = `${shifts[id] ?? 0}px 0`;
      }
    };
    run();
    const observer = new ResizeObserver(run);
    observer.observe(track);
    for (const ref of Object.values(refs)) if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [actual, expected, projected, scaleMax, showProjection]);

  const transition = reduced ? { duration: 0 } : { duration: 1.4, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div className="relative flex flex-col gap-5">
      {/* Pista */}
      <div className="relative mx-6 pt-9 pb-7" ref={trackRef}>
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
          <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em]" ref={metaLabelRef}>
            meta
          </span>
        </div>

        {/* fantasma: onde deveria estar hoje */}
        {expected > 0 ? (
          <div className="absolute top-0 flex flex-col items-center" style={{ left: x(expected), transform: "translateX(-50%)" }}>
            <span className="mb-1 whitespace-nowrap text-[10px] text-muted-foreground" ref={expectedLabelRef}>
              esperado {formatPercent(expected, 0)}
            </span>
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
          <span
            className="mt-3.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
            ref={actualLabelRef}
            style={{ backgroundColor: color }}
          >
            {formatPercent(actual, 0)}
          </span>
        </motion.div>

        {/* ponto projetado */}
        {showProjection ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="absolute top-6 flex -translate-x-1/2 flex-col items-center"
            initial={{ opacity: 0 }}
            style={{ left: x(projected) }}
            transition={{ duration: 0.4, delay: reduced ? 0 : 1.8 }}
          >
            <span className="size-5 rounded-full border-2 border-dotted" style={{ borderColor: color }} />
            <span className="mt-4 whitespace-nowrap text-[10px] font-semibold" ref={projectedLabelRef} style={{ color }}>
              projeção {formatPercent(projected!, 0)}
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
