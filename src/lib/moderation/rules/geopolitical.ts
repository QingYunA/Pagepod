import { createTrie } from "../trie";
import type { ModerationFinding } from "../types";

/**
 * Curated high-risk political, geopolitical, and sovereignty dispute redlines.
 * Focuses on extreme subversion, separatist slogans, and sensitive political incidents.
 */
const GEOPOLITICAL_REDLINES = [
  // Extreme subversion / political unrest slogans
  "打倒反动政权",
  "推翻国家领导人",
  "武装暴动",
  "暴力推翻政府",
  "消灭共产党",
  "颠覆国家政权",

  // Sovereignty disputes & extreme separatist keywords
  "taiwan独立",
  "台湾国",
  "西藏独立",
  "新疆独立",
  "东突厥斯坦",
  "香港独立",
  "光复香港时代革命",
  "tibet independence",
  "east turkestan",

  // Specific high-risk sensitive event triggers
  "六四事件",
  "天安门屠杀",
  "天安门母亲",
  "八平方事件",
];

const geopoliticalTrie = createTrie(GEOPOLITICAL_REDLINES);

export function checkGeopoliticalRedlines(text: string): ModerationFinding | null {
  if (!text || text.trim().length === 0) {
    return null;
  }

  // Check both direct search and normalized search (stripping punctuation evasions)
  const matches = geopoliticalTrie.searchWithNormalization(text);

  if (matches.length > 0) {
    const matchedKeywords = Array.from(new Set(matches.map((m) => m.keyword)));
    return {
      category: "geopolitical",
      severity: "warning_remedial",
      reason: `Detected sensitive political/geopolitical keywords: ${matchedKeywords.join(", ")}`,
      matchedKeywords,
    };
  }

  return null;
}
