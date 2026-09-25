"use client";

import { useMemo } from "react";
import {
  HeatmapCells,
  HeatmapChart,
  HeatmapInteractionBoundary,
  HeatmapInteractionProvider,
  HeatmapTooltip,
  HeatmapXAxis,
  HeatmapYAxis,
} from "@/components/charts/heatmap";
import type { HeatmapColumn } from "@/components/charts/heatmap/heatmap-context";
import type { DailyRow } from "@/data/types";
import { formatCompact, formatInt } from "@/lib/format";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/**
 * Entrega diária por dia da semana × semana (heatmap).
 * O Bklit usa níveis 0–4; o nível vem dos quintis da entrega da própria linha
 * e o tooltip mostra o valor real do dia.
 */
export function DeliveryHeatmap({
  rows,
  color,
  metricLabel,
}: {
  rows: DailyRow[];
  color: string;
  metricLabel: string;
}) {
  // Média de entrega por dia da semana (só dias com dado).
  const weekdayAvg = useMemo(() => {
    const acc = Array.from({ length: 7 }, () => ({ total: 0, days: 0 }));
    for (const row of rows) {
      const day = new Date(`${row.date}T12:00:00`).getDay();
      acc[day].total += row.delivered;
      acc[day].days += 1;
    }
    return acc.map((a, day) => ({ day, avg: a.days ? a.total / a.days : 0 }));
  }, [rows]);
  const maxAvg = Math.max(...weekdayAvg.map((w) => w.avg), 1);
  const bestDay = weekdayAvg.reduce((best, w) => (w.avg > best.avg ? w : best), weekdayAvg[0]);

  const { columns, valueByDate } = useMemo(() => {
    const valueByDate = new Map(rows.map((r) => [r.date, r.delivered]));
    const positive = rows.map((r) => r.delivered).filter((v) => v > 0).sort((a, b) => a - b);
    const q = (p: number) => positive[Math.min(positive.length - 1, Math.floor(p * positive.length))] ?? 0;
    const cuts = [q(0.25), q(0.5), q(0.75)];
    const level = (v: number) => (v <= 0 ? 0 : v <= cuts[0] ? 1 : v <= cuts[1] ? 2 : v <= cuts[2] ? 3 : 4);

    if (rows.length === 0) {
      return { columns: [] as HeatmapColumn[], valueByDate };
    }
    // Semanas começando no domingo, cobrindo do primeiro ao último dia.
    const first = new Date(`${rows[0].date}T12:00:00`);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    const last = new Date(`${rows.at(-1)!.date}T12:00:00`);
    const columns: HeatmapColumn[] = [];
    for (let week = 0, d = new Date(start); d <= last; week++) {
      const bins = [];
      for (let day = 0; day < 7; day++, d.setDate(d.getDate() + 1)) {
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const value = valueByDate.get(iso);
        bins.push({ bin: day, count: value === undefined ? 0 : level(value), date: new Date(d) });
      }
      columns.push({ bin: week, bins });
    }
    return { columns, valueByDate };
  }, [rows]);

  const levelColors = [
    "var(--muted)",
    `color-mix(in oklab, ${color} 25%, var(--card))`,
    `color-mix(in oklab, ${color} 50%, var(--card))`,
    `color-mix(in oklab, ${color} 75%, var(--card))`,
    color,
  ] as const;

  return (
    <div className="grid h-full gap-4 @xl:grid-cols-[minmax(0,1fr)_220px]">
      <HeatmapInteractionProvider>
        <HeatmapInteractionBoundary>
          <div className="flex h-full min-w-0 flex-col gap-2">
            <div className="h-[220px] w-full fit:h-auto fit:min-h-0 fit:flex-1">
              <HeatmapChart className="h-full w-full" data={columns} layout="fill" levelColors={levelColors}>
                <HeatmapCells />
                <HeatmapXAxis />
                <HeatmapYAxis />
                <HeatmapTooltip
                  formatLabel={(_, date) => {
                    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                    const value = valueByDate.get(iso);
                    return value === undefined ? "Fora do período" : `${formatInt(value)} ${metricLabel}`;
                  }}
                />
              </HeatmapChart>
            </div>
            <div aria-hidden className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              Menos
              {levelColors.map((c) => (
                <span className="size-3 rounded-[3px]" key={c} style={{ backgroundColor: c }} />
              ))}
              Mais
            </div>
          </div>
        </HeatmapInteractionBoundary>
      </HeatmapInteractionProvider>

      <div className="flex min-w-0 flex-col justify-center gap-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Média por dia da semana
        </p>
        <ul className="flex flex-col gap-1.5">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => {
            const w = weekdayAvg[day];
            return (
              <li className="grid grid-cols-[64px_minmax(0,1fr)_48px] items-center gap-2 text-xs" key={day}>
                <span className={day === bestDay.day ? "font-semibold text-foreground" : "text-muted-foreground"}>
                  {WEEKDAYS[day]}
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${(w.avg / maxAvg) * 100}%`, backgroundColor: color }}
                  />
                </span>
                <span className="text-right tabular-nums">{formatCompact(w.avg)}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Melhor dia: <span className="font-semibold text-foreground">{WEEKDAYS[bestDay.day].toLowerCase()}</span>
        </p>
      </div>
    </div>
  );
}
