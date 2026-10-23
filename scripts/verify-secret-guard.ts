/**
 * Verifies secret-guard detection and placeholder false-positive filtering.
 * Real-looking keys are built at runtime so this source holds no literal key.
 *
 * Run: bun run scripts/verify-secret-guard.ts
 */
import { scanForSecrets, scanAllSecrets } from "../src/lib/security/secret-guard";

let passed = 0;
let failed = 0;
function assert(cond: boolean, name: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${name}`);
  }
}

const realOpenAi = "sk-" + "a1B2c3D4e5F6g7H8i9J0k1L2";
const realOpenAi2 = "sk-" + "Q9w8E7r6T5y4U3i2O1p0Z9x8";
const realAnthropic = "sk-ant-" + "a1B2c3D4e5F6g7H8i9J0k1L2";
const realAws = "AKIA" + "Q7W8E9R2T3Y4U5I6";
const realGithub = "ghp_" + "aB3dE5gH7jK9mN1pQ3sT5vX7zA9cE1gI3kM5";
const realDb = "postgres://admin:" + "Zq8vK2mP9x" + "@db.acme-prod.io:5432/app";

console.log("Detection of realistic secrets");
assert(scanForSecrets(`const k = "${realOpenAi}"`)?.type === "openai", "openai-style key detected");
assert(scanForSecrets(`k=${realAnthropic}`)?.type === "anthropic", "anthropic-style key detected");
assert(scanForSecrets(`id ${realAws}`)?.type === "aws", "aws key id detected");
assert(scanForSecrets(`t ${realGithub}`)?.type === "github", "github token detected");
assert(scanForSecrets(`url=${realDb}`)?.type === "database_url", "database url with real host detected");
assert(scanForSecrets("-----BEGIN RSA PRIVATE KEY-----")?.type === "private_key", "private key header detected");

console.log("Placeholder filtering");
assert(scanForSecrets("AKIAIOSFODNN7EXAMPLE") === null, "AWS docs example not detected");
assert(scanForSecrets("sk-" + "x".repeat(24)) === null, "sk-xxxx placeholder not detected");
assert(scanForSecrets("sk-" + "your-api-key-goes-here-1234") === null, "sk-your-... not detected");
assert(scanForSecrets("sk-" + "1".repeat(30)) === null, "repeated single char not detected");
assert(scanForSecrets("postgres://user:password@localhost/db") === null, "localhost db url not detected");
assert(scanForSecrets("postgres://user:" + "Zq8vK2mP9x" + "@127.0.0.1:5432/db") === null, "127.0.0.1 db url not detected");
assert(scanForSecrets("mysql://u:" + "Zq8vK2mP9x" + "@db.example.com/db") === null, "example.com subdomain not detected");
assert(scanForSecrets("postgres://u:changeme@db.acme-prod.io/db") === null, "placeholder db password not detected");

console.log("Placeholder followed by real key");
assert(
  scanForSecrets(`a: sk-${"x".repeat(24)}\nb: ${realOpenAi}`)?.type === "openai",
  "real key after placeholder of same type still detected"
);
assert(
  scanForSecrets(`postgres://user:password@localhost/db\n${realDb}`)?.type === "database_url",
  "real db url after placeholder db url still detected"
);

console.log("scanAllSecrets");
const all = scanAllSecrets(`sk-${"x".repeat(24)} ${realOpenAi} ${realOpenAi2} AKIAIOSFODNN7EXAMPLE`);
assert(all.length === 2 && all.every((f) => f.type === "openai"), "scanAllSecrets filters placeholders, keeps real keys");
assert(scanAllSecrets("nothing here").length === 0, "scanAllSecrets empty on clean content");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
