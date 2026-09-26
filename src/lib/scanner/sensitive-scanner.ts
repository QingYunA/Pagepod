/**
 * Static Analysis Scanner for Sensitive Credentials & Tokens
 * Scans HTML, CSS, and JS source code before making a project public.
 */

export type SensitiveRuleKey =
  | "password"
  | "passwordHtml"
  | "apiKeyAi"
  | "apiKeyGeneric"
  | "apiKeyGithub"
  | "tokenBearer"
  | "tokenJwt"
  | "secretDb"
  | "secretAws";

export interface SensitiveRiskMatch {
  rule: string;
  ruleKey?: SensitiveRuleKey;
  category: "password" | "api_key" | "token" | "secret";
  description: string;
  sample?: string;
}

export interface ScanResult {
  hasRisk: boolean;
  matches: SensitiveRiskMatch[];
}

const SENSITIVE_PATTERNS: Array<{
  category: SensitiveRiskMatch["category"];
  rule: string;
  ruleKey: SensitiveRuleKey;
  regex: RegExp;
  description: string;
}> = [
  // 1. Password & Passphrase fields with actual hardcoded values
  {
    category: "password",
    rule: "Hardcoded Password",
    ruleKey: "password",
    regex: /(?:password|passwd|pwd)\s*[:=]\s*["']([^"']{3,})["']/i,
    description: "检测到代码中硬编码了明确的密码字段 (password/passwd/pwd)",
  },
  {
    category: "password",
    rule: "HTML Password Input Value",
    ruleKey: "passwordHtml",
    regex: /<input[^>]+type=["']password["'][^>]+value=["']([^"']+)["']/i,
    description: "检测到包含预填充默认密码的 HTML 输入框",
  },

  // 2. High-entropy Cloud & AI API Keys
  {
    category: "api_key",
    rule: "OpenAI / Anthropic API Key",
    ruleKey: "apiKeyAi",
    regex: /(?:sk-[a-zA-Z0-9_\-]{20,}|sk-ant-[a-zA-Z0-9_\-]{20,})/i,
    description: "检测到疑似 OpenAI / Anthropic 官方大模型 API Key",
  },
  {
    category: "api_key",
    rule: "Generic API Key Variable",
    ruleKey: "apiKeyGeneric",
    regex: /(?:api_key|apikey|access_key|private_key|app_secret)\s*[:=]\s*["']([^"']{8,})["']/i,
    description: "检测到代码中包含 API Key / 访问凭证变量定义",
  },
  {
    category: "api_key",
    rule: "GitHub Personal Access Token",
    ruleKey: "apiKeyGithub",
    regex: /(?:ghp_[a-zA-Z0-9]{36,}|github_pat_[a-zA-Z0-9_]{50,})/i,
    description: "检测到疑似 GitHub 访问令牌 (Personal Access Token)",
  },

  // 3. Tokens & Authorization Headers
  {
    category: "token",
    rule: "Authorization Bearer Token",
    ruleKey: "tokenBearer",
    regex: /(?:Bearer\s+[a-zA-Z0-9_\-\.]{20,})/i,
    description: "检测到 Authorization: Bearer 认证授权头信息",
  },
  {
    category: "token",
    rule: "JSON Web Token (JWT)",
    ruleKey: "tokenJwt",
    regex: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/,
    description: "检测到明文 JWT 令牌 (以 eyJ 开头)",
  },

  // 4. Cloud Database / S3 Connection Strings
  {
    category: "secret",
    rule: "Database Connection String",
    ruleKey: "secretDb",
    regex: /postgres(?:ql)?:\/\/[a-zA-Z0-9_]+:[^@\s"']+@[a-zA-Z0-9_\-\.]+/i,
    description: "检测到包含密码的数据库连接字符串",
  },
  {
    category: "secret",
    rule: "AWS / S3 Secret Access Key",
    ruleKey: "secretAws",
    regex: /(?:aws_secret_access_key|secret_key|r2_secret)\s*[:=]\s*["'][a-zA-Z0-9\/+=]{20,}["']/i,
    description: "检测到疑似 AWS / Cloudflare R2 云存储机密密钥",
  },
];

export function scanHtmlForSensitiveData(sourceCode: string): ScanResult {
  if (!sourceCode || typeof sourceCode !== "string") {
    return { hasRisk: false, matches: [] };
  }

  const matches: SensitiveRiskMatch[] = [];
  const visitedRules = new Set<string>();

  for (const item of SENSITIVE_PATTERNS) {
    const match = sourceCode.match(item.regex);
    if (match && !visitedRules.has(item.rule)) {
      visitedRules.add(item.rule);
      // Mask the found sample for safe preview in dialog
      const rawText = match[0];
      const maskedSample =
        rawText.length > 35 ? `${rawText.slice(0, 10)}...${rawText.slice(-6)}` : rawText;

      matches.push({
        rule: item.rule,
        ruleKey: item.ruleKey,
        category: item.category,
        description: item.description,
        sample: maskedSample,
      });
    }
  }

  return {
    hasRisk: matches.length > 0,
    matches,
  };
}
