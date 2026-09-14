/**
 * Static Standards & Anti-Slop Linter
 * Enforces engineering and aesthetic rules defined in AGENTS.md.
 * Run with: bun run scripts/check-standards.ts
 */

import fs from "node:fs";
import path from "node:path";

interface Violation {
  file: string;
  line: number;
  rule: string;
  match: string;
  message: string;
}

const violations: Violation[] = [];

const SRC_DIR = path.resolve(process.cwd(), "src");

interface ForbiddenSlopRule {
  label: string;
  pattern: RegExp | string;
  message: string;
}

// 1. Anti-Slop banned keywords (AGENTS.md Section 1.4)
const FORBIDDEN_SLOP_WORDS: ForbiddenSlopRule[] = [
  { pattern: /\bVIP\b/i, label: "VIP", message: "Banned casino/VIP slop word: 'VIP'. Use 'PRO', '权益' or '功能' instead." },
  { pattern: "尊享", label: "尊享", message: "Banned casino/VIP slop word: '尊享'. Use '权益' or '功能' instead." },
  { pattern: "特权", label: "特权", message: "Banned casino/VIP slop word: '特权'. Use '权益' or '功能' instead." },
  { pattern: "自由扩容", label: "自由扩容", message: "Banned exaggerated claim: '自由扩容'. Use specific quota numbers." },
  { pattern: "神级", label: "神级", message: "Banned exaggerated slang: '神级'." },
  { pattern: "无敌", label: "无敌", message: "Banned exaggerated slang: '无敌'." },
];

// 2. Anti-Pattern banned Tailwind aesthetic classes (AGENTS.md Section 1.1)
const FORBIDDEN_TAILWIND_PATTERNS = [
  {
    regex: /\bblur-3xl\s+bg-[a-z]+-[0-9]+\/[0-9]+\b/,
    message: "Banned diffuse glow/blob (AGENTS.md 1.1: 严禁弥散光斑与背景光晕).",
  },
  {
    regex: /\bbg-gradient-to-r\s+from-(amber|sky|indigo|emerald|rose|purple)-[0-9]+/,
    message: "Banned chromatic background gradient in UI components (AGENTS.md 1.1/1.4). Use Zinc monochrome.",
  },
  {
    regex: /\bshadow-2xl\s+rounded-3xl\b/,
    message: "Banned heavy shadow and oversized radius (AGENTS.md 1.1: 严禁臃肿大圆角与厚重阴影).",
  },
];

function scanFile(filePath: string) {
  const relPath = path.relative(process.cwd(), filePath);
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;

    // Check anti-slop vocabulary
    for (const slop of FORBIDDEN_SLOP_WORDS) {
      let matchedText: string | null = null;
      if (typeof slop.pattern === "string") {
        if (lineText.includes(slop.pattern)) {
          matchedText = slop.pattern;
        }
      } else {
        const m = lineText.match(slop.pattern);
        if (m) {
          matchedText = m[0];
        }
      }

      if (matchedText) {
        violations.push({
          file: relPath,
          line: lineNum,
          rule: "AGENTS.md 1.4 (Anti-Slop & Editorial Voice)",
          match: matchedText,
          message: slop.message,
        });
      }
    }

    // Check banned tailwind anti-patterns in TSX/JSX
    if (filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) {
      for (const pattern of FORBIDDEN_TAILWIND_PATTERNS) {
        const match = lineText.match(pattern.regex);
        if (match) {
          violations.push({
            file: relPath,
            line: lineNum,
            rule: "AGENTS.md 1.1 (Anti-Patterns / Monochrome Zinc)",
            match: match[0],
            message: pattern.message,
          });
        }
      }

      // Check hardcoded Chinese admin fallback
      if (lineText.includes('|| "管理员"') || lineText.includes("|| '管理员'")) {
        violations.push({
          file: relPath,
          line: lineNum,
          rule: "AGENTS.md 1.4 (Bilingual Internationalization)",
          match: lineText.trim(),
          message: "Hardcoded Chinese fallback '管理员' detected. Must dynamically support 'Admin' in English mode.",
        });
      }
    }
  });

  // Whole-file multi-line checks for TSX/JSX
  if (filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) {
    // 3. Check illegal nested interactive elements: <button> containing <Link> or <a>
    const buttonRegex = /<button\b[^>]*>([\s\S]*?)<\/button>/g;
    let buttonMatch: RegExpExecArray | null;
    while ((buttonMatch = buttonRegex.exec(content)) !== null) {
      const inner = buttonMatch[1];
      if (/<(Link|a)\b[^>]*>/.test(inner)) {
        const lineNum = content.slice(0, buttonMatch.index).split("\n").length;
        violations.push({
          file: relPath,
          line: lineNum,
          rule: "AGENTS.md 1.2 (Card-Level Full Navigation Invariant & DOM Nesting)",
          match: buttonMatch[0].slice(0, 100).replace(/\s+/g, " ") + "...",
          message: "Illegal nested interactive control: <button> contains <Link> or <a>, which traps clicks and violates HTML specification.",
        });
      }
    }
  }

  // 4. Check Static ISR in Marketing Server Components: no searchParams allowed in page.tsx
  const isMarketingPage = relPath.replace(/\\/g, "/").includes("src/app/(marketing)") && relPath.endsWith("page.tsx");
  if (isMarketingPage) {
    const searchParamsMatch = content.match(/\bsearchParams\b/);
    if (searchParamsMatch && searchParamsMatch.index !== undefined) {
      const lineNum = content.slice(0, searchParamsMatch.index).split("\n").length;
      violations.push({
        file: relPath,
        line: lineNum,
        rule: "AGENTS.md 2.9 (Static ISR & Zero Cold-Start DDL Invariant)",
        match: "searchParams",
        message: "Public marketing page Server Component must NOT consume searchParams directly as it de-opts page to dynamic SSR. Offload to Client Component.",
      });
    }
  }

  // 5. Check Cold-Start Zero DDL: ensurePostgresTables() must not be called in request paths
  const isRequestPath = relPath.replace(/\\/g, "/").startsWith("src/app") || relPath.replace(/\\/g, "/").startsWith("src/lib/services");
  if (isRequestPath) {
    const ddlMatch = content.match(/\bensurePostgresTables\s*\(/);
    if (ddlMatch && ddlMatch.index !== undefined) {
      const lineNum = content.slice(0, ddlMatch.index).split("\n").length;
      violations.push({
        file: relPath,
        line: lineNum,
        rule: "AGENTS.md 2.9 (Cold-Start Zero DDL Invariant)",
        match: "ensurePostgresTables()",
        message: "Direct call to ensurePostgresTables() detected in runtime request path. DDL must be gated in withTableFallback or migrations.",
      });
    }
  }
}

function walkDir(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      scanFile(fullPath);
    }
  }
}

console.log("Running AGENTS.md Standards & Anti-Slop Check on src/...");
walkDir(SRC_DIR);

if (violations.length === 0) {
  console.log("✓ All standards checks passed! Codebase fully adheres to AGENTS.md.\n");
  process.exit(0);
} else {
  console.error(`\n✗ Found ${violations.length} violations of AGENTS.md:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    Rule:    ${v.rule}`);
    console.error(`    Match:   "${v.match}"`);
    console.error(`    Message: ${v.message}\n`);
  }
  process.exit(1);
}
