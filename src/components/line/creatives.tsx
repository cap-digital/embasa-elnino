import { ExternalLink, Play } from "lucide-react";
import Image from "next/image";
import type { Creative } from "@/data/types";
import { formatCompact, formatCurrency, formatInt, formatPercent, formatUnitCost } from "@/lib/format";

const safe = (a: number, b: number) => (b > 0 ? a / b : 0);

function Stat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-heading text-sm font-extrabold tabular-nums" : "text-xs font-semibold tabular-nums"}>{value}</dd>
    </div>
  );
}

/** Banners estáticos (Display) com prévia e métricas por criativo. */
export function CreativeGallery({ creatives, color }: { creatives: Creative[]; color: string }) {
  const images = creatives.filter((c) => c.image);
  const totalImpr = images.reduce((acc, c) => acc + c.impressions, 0);
  if (images.length === 0) {
    return <p className="p-2 text-xs text-muted-foreground">Nenhum criativo com entrega no período.</p>;
  }
  return (
    <ul className="grid gap-3 @md:grid-cols-2 @3xl:grid-cols-3">
      {images.map((c) => {
        const share = safe(c.impressions, totalImpr);
        const img = c.image!;
        return (
          <li className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-background p-2.5" key={c.id}>
            {/* Prévia do criativo inteiro, no formato original */}
            <div className="flex h-36 items-center justify-center overflow-hidden rounded-lg bg-muted p-2">
              <Image
                alt={`Banner ${img.width}×${img.height}`}
                className="h-auto max-h-full w-auto max-w-full object-contain shadow-sm"
                height={img.height || 250}
                sizes="(min-width: 1280px) 320px, 90vw"
                src={img.url}
                unoptimized
                width={img.width || 300}
              />
            </div>
            {/* % das impressões, logo abaixo da prévia */}
            <div>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-heading font-extrabold">{img.width}×{img.height}</span>
                <span className="tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">{formatPercent(share, 0)}</span> das impressões
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${share * 100}%`, backgroundColor: color }} />
              </div>
            </div>
            <dl className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-x-3 gap-y-1">
              <Stat label="Impressões" strong value={formatCompact(c.impressions)} />
              <Stat label="Cliques" value={formatInt(c.clicks)} />
              <Stat label="CTR" value={formatPercent(safe(c.clicks, c.impressions), 2)} />
              <Stat label="Investido" value={formatCurrency(c.spend)} />
              <Stat label="CPM" value={formatUnitCost(safe(c.spend, c.impressions) * 1000)} />
            </dl>
          </li>
        );
      })}
    </ul>
  );
}

/** Vídeos (YouTube) com miniatura, link para assistir e métricas por vídeo. */
export function VideoList({ creatives, color }: { creatives: Creative[]; color: string }) {
  const videos = creatives.filter((c) => c.video);
  if (videos.length === 0) {
    return <p className="p-2 text-xs text-muted-foreground">Nenhum vídeo com entrega no período.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {videos.map((c) => {
        const v = c.video!;
        const href = v.isShort ? `https://www.youtube.com/shorts/${v.youtubeId}` : `https://www.youtube.com/watch?v=${v.youtubeId}`;
        const q = c.quartiles;
        return (
          <li className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-2.5 @sm:flex-row" key={c.id}>
            <a
              aria-label={`Assistir “${v.title}” no YouTube`}
              className="group relative block aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-muted @sm:w-44"
              href={href}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Image
                alt={`Miniatura do vídeo ${v.title}`}
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                fill
                sizes="(min-width: 640px) 176px, 100vw"
                src={`https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`}
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/35">
                <span className="flex size-10 items-center justify-center rounded-full bg-white/95 text-brand-navy shadow-md">
                  <Play aria-hidden className="ml-0.5 size-5 fill-current" />
                </span>
              </span>
            </a>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-semibold leading-snug">{v.title || c.name}</p>
              <a
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-blue hover:underline"
                href={href}
                rel="noopener noreferrer"
                target="_blank"
              >
                Assistir no YouTube <ExternalLink aria-hidden className="size-3" />
              </a>
              <dl className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-x-3 gap-y-1.5">
                <Stat label="Visualizações" strong value={formatInt(c.views)} />
                <Stat label="Impressões" value={formatCompact(c.impressions)} />
                <Stat label="VTR" value={formatPercent(safe(c.views, c.impressions), 1)} />
                <Stat label="Investido" value={formatCurrency(c.spend)} />
                <Stat label="CPV" value={formatUnitCost(safe(c.spend, c.views))} />
                <Stat label="Cliques" value={formatInt(c.clicks)} />
              </dl>
              {q ? (
                <div className="mt-2 grid grid-cols-4 gap-1.5" aria-label="Retenção por quartil">
                  {(["q25", "q50", "q75", "q100"] as const).map((k, i) => (
                    <div key={k}>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${q[k] * 100}%`, backgroundColor: color }} />
                      </div>
                      <p className="mt-0.5 whitespace-nowrap text-[10px] tabular-nums text-muted-foreground">
                        {["25%", "50%", "75%", "100%"][i]}{" "}
                        <span className="font-semibold text-foreground">{formatPercent(q[k], 0)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
