"use client";

import { motion } from "motion/react";
import { useState } from "react";
import type { TimelineRow, TimelineSegment } from "@/data";
import { formatCurrency, formatCurrencyCompact, formatInt } from "@/lib/format";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;
const toTime = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/** "2026-09-25" → "25/9". */
function shortDay(iso: string) {
  const [, month, day] = iso.split("-").map(Number);
  return `${day}/${month}`;
}

interface Props {
  rows: TimelineRow[];
  /** Período da campanha (yyyy-mm-dd, inclusive). */
  start: string;
  end: string;
  /** Hoje (yyyy-mm-dd) para o marcador. */
  today: string;
}

/**
 * Linha do tempo da veiculação por plataforma (estilo Gantt).
 * Barras cheias = dias com investimento (valor no rótulo);
 * faixa clara = período programado da campanha na plataforma.
 */
export function InvestmentTimeline({ rows, start, end, today }: Props) {
  const [hovered, setHovered] = useState<{ row: string; seg: number } | null>(null);
  const t0 = toTime(start);
  const totalDays = Math.round((toTime(end) - t0) / DAY_MS) + 1;
  const pos = (iso: string) => ((toTime(iso) - t0) / DAY_MS / totalDays) * 100;
  const span = (a: string, b: string) => ((Math.round((toTime(b) - toTime(a)) / DAY_MS) + 1) / totalDays) * 100;

  // Grade diária até 14 dias (semanal acima); rótulos de dois em dois.
  const step = totalDays <= 14 ? 1 : 7;
  const labelEvery = 2;
  const ticks = Array.from({ length: Math.ceil(totalDays / step) }, (_, i) =>
    new Date(t0 + i * step * DAY_MS).toISOString().slice(0, 10)
  );
  const todayPos = today >= start && today <= end ? pos(today) + 100 / totalDays / 2 : null;

  return (
    <div className="flex min-w-0 flex-col fit:h-full">
      {/* Cabeçalho do eixo */}
      <div className="grid grid-cols-[minmax(96px,150px)_minmax(0,1fr)] gap-3 border-b border-border pb-1.5">
        <span />
        <div className="relative h-4">
          {ticks.map((t, i) => (
            <span
              className={cn(
                "absolute -translate-x-1/2 whitespace-nowrap text-[11px] font-medium tabular-nums text-muted-foreground",
                i % labelEvery !== 0 && "hidden"
              )}
              key={t}
              style={{ left: `${pos(t) + 100 / totalDays / 2}%` }}
            >
              {shortDay(t)}
            </span>
          ))}
        </div>
      </div>

      <ul className="min-h-0 flex-1 fit:overflow-y-auto" onMouseLeave={() => setHovered(null)}>
        {rows.map((row) => {
          const dim = hovered !== null && hovered.row !== row.id;
          return (
            <li
              className={cn(
                "grid grid-cols-[minmax(96px,150px)_minmax(0,1fr)] items-center gap-3 border-b border-border/70 py-1.5 transition-opacity duration-300",
                dim && "opacity-35"
              )}
              key={row.id}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-xs font-semibold">
                  <span className="size-2 shrink-0 rounded-[3px]" style={{ backgroundColor: row.color }} />
                  <span className="truncate">{row.name}</span>
                </p>
                <p className="truncate pl-3.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{row.hint}</p>
              </div>

              <div className="relative h-6">
                {/* grade vertical por dia */}
                {ticks.map((t) => (
                  <span aria-hidden className="absolute inset-y-[-6px] w-px bg-border/60" key={t} style={{ left: `${pos(t)}%` }} />
                ))}
                {todayPos !== null ? (
                  <span aria-hidden className="absolute inset-y-[-6px] w-px bg-brand-orange/70" style={{ left: `${todayPos}%` }} />
                ) : null}

                {!row.hasData ? (
                  <span className="absolute inset-y-0 left-0 z-10 flex items-center">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      sem dados
                    </span>
                  </span>
                ) : null}

                {/* período programado */}
                {row.flight ? (
                  <span
                    aria-hidden
                    className="absolute inset-y-0.5 rounded-full"
                    style={{
                      left: `${pos(row.flight.start)}%`,
                      width: `${span(row.flight.start, row.flight.end)}%`,
                      backgroundColor: `color-mix(in oklab, ${row.color} 14%, transparent)`,
                    }}
                  />
                ) : null}

                {row.segments.map((seg, i) => (
                  <Bar
                    active={hovered?.row === row.id && hovered.seg === i}
                    color={row.color}
                    key={seg.start}
                    left={pos(seg.start)}
                    metricLabel={row.metricLabel}
                    name={row.name}
                    onEnter={() => setHovered({ row: row.id, seg: i })}
                    seg={seg}
                    width={span(seg.start, seg.end)}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-5 rounded-full bg-foreground/70" /> dias com investimento
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-5 rounded-full bg-foreground/10" /> período programado
        </span>
        {todayPos !== null ? (
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-px bg-brand-orange" /> hoje
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Bar({
  seg,
  left,
  width,
  color,
  name,
  metricLabel,
  active,
  onEnter,
}: {
  seg: TimelineSegment;
  left: number;
  width: number;
  color: string;
  name: string;
  metricLabel: string;
  active: boolean;
  onEnter: () => void;
}) {
  const label = formatCurrencyCompact(seg.spend);
  const labelInside = width >= 14;
  const period = seg.start === seg.end ? shortDay(seg.start) : `${shortDay(seg.start)} – ${shortDay(seg.end)}`;
  return (
    <div
      className="group absolute inset-y-0"
      onFocus={onEnter}
      onMouseEnter={onEnter}
      style={{ left: `${left}%`, width: `${width}%` }}
      tabIndex={0}
    >
      <motion.div
        className="flex h-full items-center overflow-hidden rounded-full px-2 shadow-sm"
        initial={{ scaleX: 0 }}
        style={{ backgroundColor: color, originX: 0, boxShadow: active ? `0 0 0 3px color-mix(in oklab, ${color} 30%, transparent)` : undefined }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        viewport={{ once: true }}
        whileInView={{ scaleX: 1 }}
      >
        {labelInside ? (
          <span className="whitespace-nowrap text-[10px] font-semibold tracking-wide text-white tabular-nums">{label}</span>
        ) : null}
      </motion.div>
      {!labelInside ? (
        <span className="pointer-events-none absolute top-1/2 left-full ml-1.5 -translate-y-1/2 whitespace-nowrap text-[10px] font-semibold tabular-nums text-foreground">
          {label}
        </span>
      ) : null}

      {/* tooltip */}
      <div
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max -translate-x-1/2 rounded-lg bg-chart-tooltip-background px-3 py-2 text-[11px] text-chart-tooltip-foreground shadow-lg backdrop-blur transition-opacity",
          active ? "opacity-100" : "opacity-0"
        )}
        role="tooltip"
      >
        <p className="font-semibold">{name}</p>
        <p className="text-chart-tooltip-muted">{period}</p>
        <p className="mt-1 tabular-nums">Investido: {formatCurrency(seg.spend)}</p>
        <p className="tabular-nums">
          {metricLabel.charAt(0).toUpperCase() + metricLabel.slice(1)}: {formatInt(seg.delivered)}
        </p>
      </div>
    </div>
  );
}
