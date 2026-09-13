/**
 * Zero-dependency, high-performance Aho-Corasick string matching automaton.
 * Scans text in O(N) linear time regardless of dictionary size.
 */

export interface TrieMatch {
  keyword: string;
  index: number;
}

interface TrieNode {
  children: Map<string, TrieNode>;
  fail: TrieNode | null;
  outputs: string[];
}

function createNode(): TrieNode {
  return {
    children: new Map(),
    fail: null,
    outputs: [],
  };
}

export interface Trie {
  search(text: string): TrieMatch[];
  searchWithNormalization(text: string): TrieMatch[];
}

export function createTrie(keywords: string[]): Trie {
  const root = createNode();

  // 1. Build Trie structure
  for (const rawKw of keywords) {
    const trimmed = rawKw.trim();
    if (!trimmed) continue;
    const kw = trimmed.toLowerCase();

    let curr = root;
    for (const char of kw) {
      if (!curr.children.has(char)) {
        curr.children.set(char, createNode());
      }
      curr = curr.children.get(char)!;
    }
    curr.outputs.push(trimmed);
  }

  // 2. Build Aho-Corasick failure links via BFS queue
  const queue: TrieNode[] = [];
  for (const child of root.children.values()) {
    child.fail = root;
    queue.push(child);
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;

    for (const [char, child] of curr.children) {
      queue.push(child);

      let failNode = curr.fail;
      while (failNode && !failNode.children.has(char)) {
        failNode = failNode.fail;
      }

      child.fail = failNode ? failNode.children.get(char)! : root;
      // Merge output matches from failure link
      if (child.fail.outputs.length > 0) {
        child.outputs = [...child.outputs, ...child.fail.outputs];
      }
    }
  }

  // Search function
  function search(text: string): TrieMatch[] {
    const matches: TrieMatch[] = [];
    const normalized = text.toLowerCase();
    let curr = root;

    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i];

      while (curr !== root && !curr.children.has(char)) {
        curr = curr.fail || root;
      }

      curr = curr.children.get(char) || root;

      if (curr.outputs.length > 0) {
        for (const kw of curr.outputs) {
          matches.push({
            keyword: kw,
            index: i - kw.length + 1,
          });
        }
      }
    }

    return matches;
  }

  // Search with punctuation and whitespace stripping for evasion detection
  function searchWithNormalization(text: string): TrieMatch[] {
    // Strips common evasive separators like dots, hyphens, spaces, asterisks
    const stripped = text.replace(/[\s.,_\-*~|/\\·#@+=^&%$]+/g, "");
    return search(stripped);
  }

  return {
    search,
    searchWithNormalization,
  };
}
