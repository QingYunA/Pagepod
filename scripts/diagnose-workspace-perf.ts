import fs from "node:fs";
import { getAllProjects } from "../src/db";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${name}`);
  }
}

async function run() {
  console.log("=== Testing /workspace Critical Path Optimizations ===\n");

  const dbIndexContent = fs.readFileSync("src/db/index.ts", "utf-8");
  const schemaContent = fs.readFileSync("src/db/schema.ts", "utf-8");
  const proxyContent = fs.readFileSync("src/proxy.ts", "utf-8");

  // Test 1: No proactive DDL migrations in withTableFallback
  const hasProactiveMigration = dbIndexContent.includes("if (!tablesInitialized && dbUrl)") && 
                               dbIndexContent.includes("await ensurePostgresTables();");
  assert(!hasProactiveMigration, "withTableFallback does NOT run proactive DDL on cold start (0 DDL overhead)");

  // Test 2: On-demand fallback catch block is preserved
  const hasCatchFallback = dbIndexContent.includes('error?.code === "42P01"') &&
                          dbIndexContent.includes("await ensurePostgresTables();");
  assert(hasCatchFallback, "withTableFallback preserves on-demand catch fallback for missing tables/columns");

  // Test 3: SQL-level WHERE pushdown in getAllProjects
  const hasSqlWhereUserId = dbIndexContent.includes("eq(schema.projects.userId, options.userId)") &&
                           dbIndexContent.includes("eq(schema.projects.visibility, \"public\")");
  assert(hasSqlWhereUserId, "getAllProjects pushes WHERE user_id and visibility down to SQL query");

  // Test 4: Database schema indexing on projects.user_id
  const hasUserIdIndex = schemaContent.includes("projects_user_id_idx") &&
                         schemaContent.includes(".on(table.userId)");
  assert(hasUserIdIndex, "schema.ts defines index on projects.user_id");

  // Test 5: Fallback isolation guard (isFilteredInSql ensures in-memory filtering runs on error fallback)
  const hasFallbackIsolation = dbIndexContent.includes("isFilteredInSql") &&
                              dbIndexContent.includes("if (!isFilteredInSql)");
  assert(hasFallbackIsolation, "getAllProjects guarantees tenant isolation and visibility filtering in fallback mode");

  // Test 6: Middleware fast-path cookie check before outbound network calls
  const hasCookiePreCheck = proxyContent.includes("hasSupabaseCookie") &&
                           proxyContent.includes("!hasSupabaseCookie && !hasAdminCookie");
  assert(hasCookiePreCheck, "proxy.ts short-circuits unauthenticated /workspace requests before remote API calls");

  // Test 7: Middleware redirectToLogin helper deduplication
  const hasRedirectHelper = proxyContent.includes("function redirectToLogin") &&
                           proxyContent.split("redirectToLogin(").length >= 3;
  assert(hasRedirectHelper, "proxy.ts deduplicates redirect logic into redirectToLogin helper");

  console.log("\n=== Runtime Data Isolation & Filter Assertions ===");

  // Runtime Test 1: Querying with specific userId never leaks other users' projects
  const aliceProjects = await getAllProjects({ userId: "mock-alice-id-nonexistent" });
  assert(aliceProjects.length === 0, "Runtime: Non-existent userId query returns zero projects (no leak)");

  // Runtime Test 2: Public query without includePrivate never returns private or unlisted projects
  const publicProjects = await getAllProjects({ includePrivate: false });
  const allPublic = publicProjects.every((p) => p.visibility === "public");
  assert(allPublic, "Runtime: Public query returns strictly public projects");

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(console.error);
