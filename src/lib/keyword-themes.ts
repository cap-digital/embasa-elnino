import type { Keyword } from "@/data/types";

const STOPWORDS = new Set([
  "como", "de", "do", "da", "dos", "das", "o", "a", "os", "as", "e", "no", "na", "nos", "nas",
  "em", "para", "pra", "com", "que", "um", "uma", "se", "por", "ao", "aos", "mais", "sobre",
  "qual", "quais", "onde", "3", "dicas",
]);

const fold = (word: string) => word.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Termos mais presentes nas palavras-chave (sem artigos/preposições).
 * Agrupa variações com e sem acento e exibe a grafia mais comum.
 */
export function keywordThemes(keywords: Keyword[], limit = 8) {
  const counts = new Map<string, { count: number; spellings: Map<string, number>; clicks: number }>();
  for (const keyword of keywords) {
    const seen = new Set<string>();
    for (const raw of keyword.text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
      if (!raw || STOPWORDS.has(fold(raw)) || raw.length < 3) {
        continue;
      }
      const key = fold(raw);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const entry = counts.get(key) ?? { count: 0, spellings: new Map(), clicks: 0 };
      entry.count += 1;
      entry.clicks += keyword.clicks;
      entry.spellings.set(raw, (entry.spellings.get(raw) ?? 0) + 1);
      counts.set(key, entry);
    }
  }
  return [...counts.values()]
    .map((entry) => ({
      term: [...entry.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0],
      count: entry.count,
      clicks: entry.clicks,
    }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term, "pt-BR"))
    .slice(0, limit);
}
