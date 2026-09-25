import { InViewMount } from "@/components/motion/in-view-mount";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Altura mínima reservada fora do modo `fit:` (nele o card preenche a célula do grid). */
  minHeight?: number;
  action?: React.ReactNode;
  /** Sem padding interno no corpo (ex.: listas roláveis). */
  flush?: boolean;
  /** Corpo rolável (scroll dentro do componente, não na página). */
  scroll?: boolean;
}

/** Cartão de painel: revela no scroll e só monta o conteúdo quando visível. */
export function ChartCard({
  title,
  description,
  children,
  className,
  minHeight = 260,
  action,
  flush = false,
  scroll = false,
}: ChartCardProps) {
  return (
    <Reveal
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-border bg-card shadow-sm fit:min-h-0",
        className
      )}
      y={12}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 px-4 pt-3.5 pb-2">
        <div className="min-w-0">
          <h3 className="truncate font-heading text-sm font-extrabold tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={description}>
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <InViewMount
        className={cn(
          "@container flex-1 fit:min-h-0",
          flush ? "" : "px-3 pb-3",
          scroll && "max-h-[520px] overflow-y-auto fit:max-h-none"
        )}
        minHeight={minHeight}
      >
        {children}
      </InViewMount>
    </Reveal>
  );
}
