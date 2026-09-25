"use client";

import { CheckCircle2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { formatProgress } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /** `investment` nunca passa de 100%; `metric` pode passar (overdelivery). */
  variant: "investment" | "metric";
  /** Fração 0–1 (investimento, já travada) ou 0–∞ (métrica). */
  progress: number;
  color: string;
  /** Ritmo esperado para a data (0–1). Desenha um marcador na barra. */
  expected?: number;
  label: string;
  valueLabel?: string;
  complete?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const heights = { sm: "h-2", md: "h-3", lg: "h-4" } as const;

export function ProgressBar({
  variant,
  progress,
  color,
  expected,
  label,
  valueLabel,
  complete = false,
  size = "md",
  className,
}: ProgressBarProps) {
  const reduced = useReducedMotion();

  // Regra obrigatória: investimento trava em 100%, sempre.
  const safeProgress =
    variant === "investment" ? Math.min(Math.max(progress, 0), 1) : Math.max(progress, 0);
  const over = variant === "metric" && safeProgress > 1;
  // Quando passa de 100%, a barra inteira representa o total entregue e a meta
  // vira um marcador; o excedente ganha textura própria.
  const scale = over ? 1 / safeProgress : 1;
  const solidWidth = over ? scale : safeProgress;
  const goalPosition = over ? scale : 1;
  const expectedPosition =
    expected !== undefined ? Math.min(expected * scale, 1) : undefined;
  const isDone = variant === "investment" && (complete || safeProgress >= 1);
  const fillColor = isDone ? "var(--brand-lime)" : color;

  const transition = { duration: 1.1, ease: [0.22, 1, 0.36, 1] as const };
  const initial = reduced ? false : { width: 0 };

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5 font-medium text-muted-foreground">
          <span className="truncate">{label}</span>
          {isDone ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-status-good px-1.5 py-0.5 text-[11px] font-semibold text-status-good-foreground">
              <CheckCircle2 aria-hidden className="size-3" />
              Investimento concluído
            </span>
          ) : null}
          {over ? (
            <span className="inline-flex items-center rounded-full bg-status-good px-1.5 py-0.5 text-[11px] font-semibold text-status-good-foreground">
              +{formatProgress(safeProgress - 1)} acima da meta
            </span>
          ) : null}
        </span>
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 font-heading text-sm font-extrabold tabular-nums text-foreground">
          {formatProgress(safeProgress)}
          {valueLabel ? (
            <span className="whitespace-nowrap font-sans text-xs font-medium text-muted-foreground">
              {valueLabel}
            </span>
          ) : null}
        </span>
      </div>

      <div
        aria-label={`${label}: ${formatProgress(safeProgress)}`}
        aria-valuemax={over ? Math.round(safeProgress * 100) : 100}
        aria-valuemin={0}
        aria-valuenow={Math.round(safeProgress * 100)}
        className={cn(
          "relative w-full overflow-visible rounded-full bg-muted",
          heights[size]
        )}
        role="progressbar"
      >
        {/* Preenchimento principal */}
        <motion.div
          className={cn("absolute inset-y-0 left-0 rounded-full", over && "rounded-r-none")}
          initial={initial}
          style={{ backgroundColor: fillColor }}
          transition={transition}
          viewport={{ once: true }}
          whileInView={{ width: `${solidWidth * 100}%` }}
        />

        {/* Excedente (overdelivery), com textura distinta */}
        {over ? (
          <motion.div
            className="absolute inset-y-0 rounded-r-full"
            initial={reduced ? false : { width: 0 }}
            style={{
              left: `${scale * 100}%`,
              backgroundImage: `repeating-linear-gradient(135deg, ${color} 0 5px, color-mix(in oklab, ${color} 45%, white) 5px 10px)`,
            }}
            transition={{ ...transition, delay: 0.5 }}
            viewport={{ once: true }}
            whileInView={{ width: `${(1 - scale) * 100}%` }}
          />
        ) : null}

        {/* Marcador da meta (100%) quando há excedente */}
        {over ? (
          <div
            aria-hidden
            className="absolute -inset-y-1 w-0.5 rounded-full bg-foreground"
            style={{ left: `calc(${goalPosition * 100}% - 1px)` }}
            title="Meta contratada (100%)"
          />
        ) : null}

        {/* Marcador do ritmo esperado */}
        {expectedPosition !== undefined && !isDone ? (
          <div
            aria-hidden
            className="absolute -inset-y-1 w-0.5 rounded-full bg-foreground/60"
            style={{ left: `calc(${expectedPosition * 100}% - 1px)` }}
            title={`Ritmo esperado: ${formatProgress(expected ?? 0)}`}
          />
        ) : null}
      </div>
    </div>
  );
}
