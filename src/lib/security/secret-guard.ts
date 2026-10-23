/**
 * Secret Leak Guard
 * Lightweight, zero-dependency heuristic scanner to prevent users from
 * inadvertently publishing private API keys, cloud credentials, and database secrets.
 * Usable on both client (drag-and-drop pre-flight) and server.
 */

export interface SecretFinding {
  type: "openai" | "anthropic" | "gemini" | "aws" | "github" | "private_key" | "database_url";
  label: string;
  matchedPattern: string;
  snippet: string; // Masked representation for safe UI rendering
}

interface Rule {
  type: SecretFinding["type"];
  label: string;
  regex: RegExp;
}

const SECRET_RULES: Rule[] = [
  {
    type: "anthropic",
    label: "Anthropic API Key",
    regex: /\b(sk-ant-[a-zA-Z0-9_\-]{20,})\b/g,
  },
  {
    type: "openai",
    label: "OpenAI / LLM API Key",
    regex: /\b(sk-[a-zA-Z0-9_\-]{20,})\b/g,
  },
  {
    type: "gemini",
    label: "Google AI / Gemini API Key",
    regex: /\b(AIzaSy[a-zA-Z0-9_\-]{33})\b/g,
  },
  {
    type: "aws",
    label: "AWS Access Key ID",
    regex: /\b(AKIA[0-9A-Z]{16})\b/g,
  },
  {
    type: "github",
    label: "GitHub Personal Access Token",
    regex: /\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{50,})\b/g,
  },
  {
    type: "private_key",
    label: "Private Key Certificate",
    regex: /(-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----)/g,
  },
  {
    type: "database_url",
    label: "Database Connection String with Password",
    regex: /\b((?:postgres|postgresql|mysql|mongodb(?:\+srv)?):\/\/[^:\s'"]+:([^@\s'"]+)@[^\s'"]+)\b/gi,
  },
];

function maskSecret(secret: string): string {
  if (secret.length <= 8) return "********";
  const start = secret.slice(0, 4);
  const end = secret.slice(-4);
  return `${start}••••••••${end}`;
}

const PLACEHOLDER_WORDS = ["example", "xxxx", "your", "placeholder", "dummy", "fake", "test"];
const PLACEHOLDER_DB_PASSWORDS = ["password", "pass", "secret", "changeme", "***", "<password>", "123456"];

function isPlaceholder(type: SecretFinding["type"], matched: string, password?: string): boolean {
  const lower = matched.toLowerCase();
  if (PLACEHOLDER_WORDS.some((w) => lower.includes(w))) return true;
  if (/(.)\1{7,}/.test(matched)) return true;

  if (type === "database_url") {
    if (password && PLACEHOLDER_DB_PASSWORDS.includes(password.toLowerCase())) return true;
    const hostMatch = /@([^/:?#\s'"]+)/.exec(matched);
    const host = hostMatch ? hostMatch[1].toLowerCase() : "";
    if (host === "localhost" || host === "127.0.0.1" || host === "example.com" || host.endsWith(".example.com")) {
      return true;
    }
  }
  return false;
}

function isPlaceholderMatch(rule: Rule, match: RegExpExecArray): boolean {
  if (rule.type === "private_key") return false;
  return isPlaceholder(rule.type, match[1], match[2]);
}

/**
 * Scans content for the first occurrence of an exposed secret.
 * Returns null if no known secret patterns match. Placeholder values are skipped.
 */
export function scanForSecrets(content: string): SecretFinding | null {
  if (!content || typeof content !== "string") return null;

  for (const rule of SECRET_RULES) {
    rule.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.regex.exec(content)) !== null) {
      if (match[1] && !isPlaceholderMatch(rule, match)) {
        return {
          type: rule.type,
          label: rule.label,
          matchedPattern: rule.type,
          snippet: maskSecret(match[1]),
        };
      }
    }
  }

  return null;
}

/**
 * Scans content and returns all detected sensitive secrets (placeholders excluded).
 */
export function scanAllSecrets(content: string): SecretFinding[] {
  if (!content || typeof content !== "string") return [];

  const findings: SecretFinding[] = [];
  for (const rule of SECRET_RULES) {
    rule.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.regex.exec(content)) !== null) {
      if (match[1] && !isPlaceholderMatch(rule, match)) {
        findings.push({
          type: rule.type,
          label: rule.label,
          matchedPattern: rule.type,
          snippet: maskSecret(match[1]),
        });
      }
    }
  }

  return findings;
}
