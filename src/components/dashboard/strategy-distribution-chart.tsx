"use client";

import { PlugZap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PieChart } from "@/components/charts/pie-chart";
import type { PieData } from "@/components/charts/pie-context";
import { PieSlice } from "@/components/charts/pie-slice";
import type { Strategy, StrategyId } from "@/data/types";
import { formatCurrencyCompact, formatCurrencyInt, formatPercent } from "@/lib/format";
import { strategyColor } from "@/lib/pace";
import { cn } from "@/lib/utils";

export interface StrategyPlatform {
  id: string;
  name: string;
  color: string;
  contracted: number;
  /** Investido (já travado no contratado). */
  spent: number;
  hasData: boolean;
}

export interface StrategyGroup {
  strategy: Strategy;
  contracted: number;
  spent: number;
  platforms: StrategyPlatform[];
}

const track = (color: string) => `color-mix(in oklab, ${color} 22%, var(--card))`;

/**
 * Distribuição do investimento por estratégia.
 * Cada fatia tem o tamanho do contratado da estratégia e vai "enchendo"
 * com a cor cheia conforme o investido cresce (resto em tom claro).
 */
export function StrategyDistributionChart({ groups }: { groups: StrategyGroup[] }) {
  const [hoveredStrategy, setHoveredStrategy] = useState<number | null>(null);
  // Espessura do anel proporcional ao tamanho da pizza (furo = 58% do raio).
  const pieBox = useRef<HTMLDivElement>(null);
  const [innerRadius, setInnerRadius] = useState(54);
  useEffect(() => {
    const el = pieBox.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      const size = Math.min(entry.contentRect.width, entry.contentRect.height);
      if (size > 0) {
        setInnerRadius(Math.round((size / 2 - 10) * 0.58));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Duas fatias por estratégia: [investido, a investir].
  const pieData = useMemo<PieData[]>(
    () =>
      groups.flatMap((g) => {
        const color = strategyColor[g.strategy.id as StrategyId];
        const spent = Math.min(g.spent, g.contracted);
        return [
          { label: `${g.strategy.label} · investido`, value: spent, color },
          { label: `${g.strategy.label} · a investir`, value: Math.max(g.contracted - spent, 0), color: track(color) },
        ];
      }),
    [groups]
  );

  const totalContracted = groups.reduce((acc, g) => acc + g.contracted, 0);
  const totalSpent = groups.reduce((acc, g) => acc + Math.min(g.spent, g.contracted), 0);
  const focus = hoveredStrategy !== null ? groups[hoveredStrategy] : null;

  return (
    <div className="flex flex-col gap-3 fit:h-full fit:min-h-0 @md:flex-row @md:items-center">
      <div className="relative mx-auto aspect-square h-[220px] max-w-full shrink-0 fit:h-auto fit:min-h-[140px] fit:flex-1 @md:h-auto @md:max-h-full @md:w-[38%] @md:max-w-[280px] @md:flex-none @md:self-center" ref={pieBox}>
        <PieChart
          className="aspect-auto h-full"
          cornerRadius={3}
          data={pieData}
          hoveredIndex={hoveredStrategy === null ? null : hoveredStrategy * 2}
          innerRadius={innerRadius}
          onHoverChange={(index) => setHoveredStrategy(index === null ? null : Math.floor(index / 2))}
          padAngle={0.012}
        >
          {pieData.map((d, i) => (
            <PieSlice hoverEffect="grow" index={i} key={d.label} />
          ))}
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-heading text-xl font-extrabold leading-tight tabular-nums @md:text-2xl">
            {formatCurrencyCompact(focus ? Math.min(focus.spent, focus.contracted) : totalSpent)}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {focus ? focus.strategy.label : "investido"}
          </span>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            de {formatCurrencyCompact(focus ? focus.contracted : totalContracted)}
          </span>
        </div>
      </div>

      <ul className="flex shrink-0 flex-col gap-1 @md:flex-1 @3xl:grid @3xl:grid-cols-2 @3xl:content-center @3xl:gap-x-6 fit:min-h-[72px] fit:shrink fit:overflow-y-auto fit:@md:max-h-full fit:@md:self-stretch">
        {groups.map((g, index) => {
          const color = strategyColor[g.strategy.id as StrategyId];
          const progress = g.contracted > 0 ? Math.min(g.spent / g.contracted, 1) : 0;
          const dimmed = hoveredStrategy !== null && hoveredStrategy !== index;
          return (
            <li
              className={cn(
                "rounded-lg px-2 py-1 transition-opacity",
                hoveredStrategy === index && "bg-muted",
                dimmed && "opacity-45"
              )}
              key={g.strategy.id}
              onMouseEnter={() => setHoveredStrategy(index)}
              onMouseLeave={() => setHoveredStrategy(null)}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="font-semibold">{g.strategy.label}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{formatPercent(progress, 0)}</span>
              </div>
              <p className="pl-[18px] text-[11px] tabular-nums text-muted-foreground">
                {formatCurrencyInt(Math.min(g.spent, g.contracted))} de {formatCurrencyCompact(g.contracted)}
              </p>
              <ul className="mt-0.5 flex flex-col gap-0.5 border-l border-border pl-3 ml-1">
                {g.platforms.map((p) => (
                  <li className="flex items-center justify-between gap-2 text-[11px]" key={p.id}>
                    <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="truncate">{p.name}</span>
                    </span>
                    {p.hasData ? (
                      <span className="shrink-0 tabular-nums">
                        {formatCurrencyInt(p.spent)}
                        <span className="text-muted-foreground"> / {formatCurrencyCompact(p.contracted)}</span>
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 text-muted-foreground">
                        <PlugZap aria-hidden className="size-3" />
                        sem dados
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
