import type { Format } from "@number-flow/react";
import type { LucideIcon } from "lucide-react";
import { CountUp } from "@/components/motion/count-up";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number;
  format?: Format;
  prefix?: string;
  suffix?: string;
  hint?: React.ReactNode;
  /** Conteúdo à direita do rótulo (badge, ícone…). */
  badge?: React.ReactNode;
  icon?: LucideIcon;
  accent?: string;
  /** Valor em cor de destaque. */
  colored?: boolean;
  className?: string;
  delay?: number;
  children?: React.ReactNode;
  /** Sem dados: mostra "—" e o aviso no lugar do número. */
  empty?: boolean;
}

export function KpiCard({
  label,
  value,
  format,
  prefix,
  suffix,
  hint,
  badge,
  icon: Icon,
  accent = "var(--brand-blue)",
  colored = false,
  className,
  delay,
  children,
  empty = false,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col gap-1 overflow-hidden rounded-2xl border border-border bg-card px-4 py-2.5 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
        {badge ??
          (Icon ? (
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `color-mix(in oklab, ${accent} 14%, transparent)`, color: accent }}
            >
              <Icon aria-hidden className="size-3" />
            </span>
          ) : null)}
      </div>
      <p
        className="truncate font-heading text-2xl font-extrabold leading-tight tracking-tight"
        style={colored ? { color: accent } : undefined}
      >
        {empty ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <CountUp delay={delay} format={format} prefix={prefix} suffix={suffix} value={value} />
        )}
      </p>
      {empty ? (
        <div className="text-[11px] leading-snug text-muted-foreground">Ainda sem dados</div>
      ) : hint ? (
        <div className="text-pretty text-[11px] leading-snug text-muted-foreground">{hint}</div>
      ) : null}
      {children}
    </div>
  );
}
