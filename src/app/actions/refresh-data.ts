"use server";

import { revalidatePath, updateTag } from "next/cache";

/** Intervalo mínimo entre atualizações forçadas (protege as APIs de cliques repetidos). */
const MIN_INTERVAL_MS = 60_000;
let lastForcedAt = 0;

export type RefreshResult =
  | { ok: true; refreshedAt: string }
  | { ok: false; retryInSeconds: number };

/**
 * Força a busca de dados novos no Google Ads, no Spotify Ads e na planilha:
 * expira o cache (a próxima leitura espera o dado novo) e revalida as páginas.
 */
export async function refreshPlatformData(): Promise<RefreshResult> {
  const now = Date.now();
  const wait = lastForcedAt + MIN_INTERVAL_MS - now;
  if (wait > 0) {
    return { ok: false, retryInSeconds: Math.ceil(wait / 1000) };
  }
  lastForcedAt = now;

  updateTag("google-ads");
  updateTag("spotify-ads");
  updateTag("planilha");
  revalidatePath("/", "layout");
  // As rotas de API têm cache de resposta próprio.
  revalidatePath("/api/google-ads");
  revalidatePath("/api/spotify");
  // A tela é atualizada pelo cliente (router.refresh) numa requisição nova:
  // o updateTag só vale a partir da próxima requisição.

  return { ok: true, refreshedAt: new Date(now).toISOString() };
}
