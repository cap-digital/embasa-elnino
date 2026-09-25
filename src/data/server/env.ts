import "server-only";

/** Lê uma variável obrigatória do servidor. Nunca expor no client. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return value;
}

/** Fuso das contas de mídia (Bahia, UTC−3, sem horário de verão). */
export const ACCOUNT_TZ_OFFSET = "-03:00";

/** Data de hoje (yyyy-mm-dd) no fuso da Bahia. */
export function todayInBahia(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bahia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
