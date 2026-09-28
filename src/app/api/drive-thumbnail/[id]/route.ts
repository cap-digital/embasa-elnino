import type { NextRequest } from "next/server";
import { getLineDatasets } from "@/data/server";

/**
 * Miniatura de um vídeo do Google Drive, buscada pelo servidor.
 * O Drive recusa (401/429) a imagem pedida direto pelo navegador de outro site;
 * daqui ela sai com cache de 1 dia. Só atende vídeos que estão na planilha.
 */

const ONE_DAY = 86_400;

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/drive-thumbnail/[id]">) {
  const { id } = await ctx.params;

  const datasets = await getLineDatasets();
  const known = Object.values(datasets).some((d) => d.creatives?.some((c) => c.driveVideo?.fileId === id));
  if (!known) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await fetch(`https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w640`, {
    next: { revalidate: ONE_DAY },
  });
  const type = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !type.startsWith("image/")) {
    return new Response("Thumbnail unavailable", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "content-type": type,
      "cache-control": `public, max-age=${ONE_DAY}, s-maxage=${ONE_DAY}, stale-while-revalidate=${ONE_DAY}`,
    },
  });
}
