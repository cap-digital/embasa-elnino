"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { refreshPlatformData } from "@/app/actions/refresh-data";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bahia",
  }).format(new Date(iso));
}

/** Botão "Atualizar dados": força nova busca nas APIs das plataformas. */
export function RefreshDataButton({
  lastUpdated,
  collapsed = false,
}: {
  /** Última busca nas APIs (ISO). */
  lastUpdated: string | null;
  collapsed?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  const onClick = () => {
    setNotice(null);
    startTransition(async () => {
      const result = await refreshPlatformData();
      if (result.ok) {
        // Nova requisição: já lê o cache expirado e busca os dados frescos.
        router.refresh();
      }
      setNotice(
        result.ok
          ? "Dados atualizados"
          : `Aguarde ${result.retryInSeconds}s para atualizar de novo`
      );
    });
  };

  const label = pending ? "Atualizando…" : "Atualizar dados";
  const status = notice ?? (lastUpdated ? `Última busca ${formatTime(lastUpdated)}` : "Sem busca recente");

  const button = (
    <button
      aria-busy={pending}
      aria-label={collapsed ? `${label}. ${status}` : undefined}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl border border-border bg-background font-semibold transition-colors hover:bg-brand-blue hover:text-white disabled:opacity-70",
        collapsed ? "size-9" : "w-full px-3 py-2 text-xs"
      )}
      disabled={pending}
      onClick={onClick}
      type="button"
    >
      <RefreshCw aria-hidden className={cn("size-3.5 shrink-0", pending && "animate-spin")} />
      {collapsed ? null : label}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={button} />
        <TooltipContent className="flex-col items-start gap-0" side="right" sideOffset={10}>
          <span className="font-semibold">{label}</span>
          <span className="text-[11px] opacity-70">{status}</span>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {button}
      <p aria-live="polite" className="truncate text-center text-[10px] text-muted-foreground">
        {status}
      </p>
    </div>
  );
}
