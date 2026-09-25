import { PlugZap } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_TEXT = "Estamos trabalhando para conectar os dados desta plataforma.";

/** Aviso exibido no lugar de números quando a linha ainda não tem dados reais. */
export function NoDataNotice({
  message,
  compact = false,
  className,
}: {
  /** Detalhe específico (ex.: "Campanha ainda não publicada no Google Ads."). */
  message?: string;
  compact?: boolean;
  className?: string;
}) {
  const detail = message && message !== DEFAULT_TEXT ? message : null;
  if (compact) {
    return (
      <p className={cn("flex items-start gap-2 rounded-xl bg-muted/70 px-3 py-2 text-xs text-muted-foreground", className)}>
        <PlugZap aria-hidden className="mt-0.5 size-3.5 shrink-0 text-brand-blue" />
        <span>
          <span className="font-semibold text-foreground">Ainda sem dados.</span> {DEFAULT_TEXT}
          {detail ? <span className="block">{detail}</span> : null}
        </span>
      </p>
    );
  }
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center shadow-sm",
        className
      )}
      role="status"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-status-neutral text-status-neutral-foreground">
        <PlugZap aria-hidden className="size-6" />
      </span>
      <div>
        <p className="font-heading text-lg font-extrabold tracking-tight">Ainda sem dados</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{DEFAULT_TEXT}</p>
        {detail ? <p className="mt-1 text-xs font-medium text-foreground">{detail}</p> : null}
      </div>
    </div>
  );
}
