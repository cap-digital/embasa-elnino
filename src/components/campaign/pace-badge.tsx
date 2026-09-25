import { CheckCircle2, Minus, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import type { PaceStatus } from "@/data/types";
import { paceMeta, toneClass } from "@/lib/pace";
import { cn } from "@/lib/utils";

const icons = { acima: TrendingUp, "no-ritmo": Minus, abaixo: TrendingDown } as const;

export function PaceBadge({
  status,
  className,
  size = "sm",
}: {
  status: PaceStatus;
  className?: string;
  size?: "sm" | "md";
}) {
  const meta = paceMeta[status];
  const Icon = icons[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        toneClass[meta.tone],
        className
      )}
    >
      <Icon aria-hidden className={size === "sm" ? "size-3" : "size-3.5"} />
      {meta.label}
    </span>
  );
}

export function GoalBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-brand-yellow px-2 py-0.5 text-[11px] font-semibold text-brand-navy-deep",
        className
      )}
    >
      <Trophy aria-hidden className="size-3" />
      Meta batida
    </span>
  );
}

export function DoneBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-status-good px-2 py-0.5 text-[11px] font-semibold text-status-good-foreground",
        className
      )}
    >
      <CheckCircle2 aria-hidden className="size-3" />
      Investimento concluído
    </span>
  );
}
