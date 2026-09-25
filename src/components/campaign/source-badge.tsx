import { Database } from "lucide-react";
import type { DataSourceId, LineDataStatus } from "@/data/types";
import { cn } from "@/lib/utils";

const sourceLabel: Record<DataSourceId, string> = {
  "google-ads": "Google Ads",
  "spotify-ads": "Spotify Ads",
  none: "Sem integração",
};

function formatFetched(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bahia",
  }).format(new Date(iso));
}

/** Indica de onde vêm os números da linha (dado real ou simulado). */
export function SourceBadge({
  source,
  status,
  fetchedAt,
  className,
}: {
  source: DataSourceId;
  status: LineDataStatus;
  fetchedAt?: string;
  className?: string;
}) {
  if (status !== "live") {
    return null;
  }
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full bg-status-good px-2 py-0.5 text-[11px] font-semibold text-status-good-foreground", className)}
      title="Dados reais da API da plataforma, atualizados a cada hora"
    >
      <Database aria-hidden className="size-3" />
      {sourceLabel[source]}
      {fetchedAt ? <span className="font-normal opacity-80">· {formatFetched(fetchedAt)}</span> : null}
    </span>
  );
}
