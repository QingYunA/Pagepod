/**
 * i18n Translation Parity & Hardcoded Chinese Regression Verifier
 * 
 * Verifies that:
 * 1. translations.zh and translations.en have 100% identical key structures.
 * 2. Template placeholders like {count}, {name}, {visibility} match between zh and en.
 * 3. Core workspace and creation pages contain zero hardcoded Chinese characters.
 * 
 * Run with: bun run scripts/verify-i18n-parity.ts (or tsx scripts/verify-i18n-parity.ts)
 */

import fs from "node:fs";
import path from "node:path";
import { translations } from "../src/lib/i18n/translations";

let failures = 0;

function logPass(msg: string) {
  console.log(`\x1b[32m✔\x1b[0m ${msg}`);
}

function logFail(msg: string) {
  console.error(`\x1b[31m✖\x1b[0m ${msg}`);
  failures++;
}

console.log("\n🌐 \x1b[1mVerifying i18n Translation Parity and Zero Hardcoded Chinese\x1b[0m\n");

// 1. Recursive Key Parity & Placeholder Verification
function checkKeyParity(zhObj: any, enObj: any, prefix = "") {
  const zhKeys = Object.keys(zhObj);
  const enKeys = Object.keys(enObj);

  // Check for missing keys in en
  for (const k of zhKeys) {
    const currentPath = prefix ? `${prefix}.${k}` : k;
    if (!(k in enObj)) {
      logFail(`Missing key in en: '${currentPath}' exists in zh but not in en`);
      continue;
    }

    const zhVal = zhObj[k];
    const enVal = enObj[k];

    if (typeof zhVal !== typeof enVal) {
      logFail(`Type mismatch at '${currentPath}': zh is ${typeof zhVal}, en is ${typeof enVal}`);
      continue;
    }

    if (typeof zhVal === "object" && zhVal !== null) {
      if (Array.isArray(zhVal)) {
        if (!Array.isArray(enVal)) {
          logFail(`Array mismatch at '${currentPath}': zh is array, en is not`);
        } else if (zhVal.length !== enVal.length) {
          logFail(`Array length mismatch at '${currentPath}': zh has ${zhVal.length} items, en has ${enVal.length}`);
        } else {
          zhVal.forEach((item, idx) => {
            if (typeof item === "object" && item !== null) {
              checkKeyParity(item, enVal[idx], `${currentPath}[${idx}]`);
            }
          });
        }
      } else {
        checkKeyParity(zhVal, enVal, currentPath);
      }
    } else if (typeof zhVal === "string" && typeof enVal === "string") {
      // Check placeholder parity like {count}, {name}, etc.
      const zhPlaceholders = (zhVal.match(/\{[a-zA-Z0-9_]+\}/g) || []).sort();
      const enPlaceholders = (enVal.match(/\{[a-zA-Z0-9_]+\}/g) || []).sort();

      if (zhPlaceholders.join(",") !== enPlaceholders.join(",")) {
        logFail(
          `Placeholder mismatch at '${currentPath}':\n` +
          `  zh: [${zhPlaceholders.join(", ")}]\n` +
          `  en: [${enPlaceholders.join(", ")}]`
        );
      }
    }
  }

  // Check for extraneous keys in en that zh does not have
  for (const k of enKeys) {
    const currentPath = prefix ? `${prefix}.${k}` : k;
    if (!(k in zhObj)) {
      logFail(`Extraneous key in en: '${currentPath}' exists in en but not in zh`);
    }
  }
}

checkKeyParity(translations.zh, translations.en);

if (failures === 0) {
  logPass("All translation keys and placeholder tokens are 100% identical between zh and en.");
}

// 2. Scan critical interaction files for zero hardcoded Chinese characters
const CRITICAL_FILES = [
  "src/app/workspace/upload/page.tsx",
  "src/app/workspace/projects/[id]/edit/editor-client.tsx",
  "src/app/workspace/settings/settings-client.tsx",
  "src/app/workspace/settings/page.tsx",
  "src/app/workspace/settings/tokens/tokens-client.tsx",
  "src/app/workspace/settings/tokens/page.tsx",
  "src/app/workspace/admin-table.tsx",
  "src/app/workspace/move-folder-dialog.tsx",
  "src/app/workspace/workspace-folder-tree.tsx",
  "src/components/public-risk-dialog.tsx",
];

const CHINESE_REGEX = /[\u4e00-\u9fa5]/;

for (const relPath of CRITICAL_FILES) {
  const absPath = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(absPath)) {
    logFail(`Critical file not found: ${relPath}`);
    continue;
  }

  const content = fs.readFileSync(absPath, "utf-8");
  const lines = content.split("\n");
  const offendingLines: { line: number; text: string }[] = [];

  lines.forEach((lineText, idx) => {
    // Ignore pure comments
    const stripped = lineText.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "").trim();
    if (CHINESE_REGEX.test(stripped)) {
      offendingLines.push({ line: idx + 1, text: stripped });
    }
  });

  if (offendingLines.length > 0) {
    logFail(`Hardcoded Chinese found in ${relPath} (${offendingLines.length} line(s)):`);
    offendingLines.slice(0, 5).forEach((item) => {
      console.error(`    L${item.line}: ${item.text}`);
    });
    if (offendingLines.length > 5) {
      console.error(`    ... and ${offendingLines.length - 5} more line(s)`);
    }
  } else {
    logPass(`Zero hardcoded Chinese characters verified in ${relPath}`);
  }
}

console.log("\n------------------------------------------------------------");
if (failures > 0) {
  console.error(`\x1b[31mFAIL:\x1b[0m ${failures} i18n issue(s) detected. Please fix before committing.\n`);
  process.exit(1);
} else {
  console.log("\x1b[32mSUCCESS:\x1b[0m All i18n translation parity and zero-Chinese checks passed!\n");
  process.exit(0);
}
