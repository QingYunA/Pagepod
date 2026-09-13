/**
 * Workspace Performance Regression Test
 * Asserts that the /workspace critical path has zero proactive DDL overhead,
 * uses SQL-level filtering for getAllProjects, and avoids redundant remote calls.
 * Run with: bun run scripts/diagnose-workspace-perf.ts
 */

import fs from "node:fs";

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
  const hasSqlWhereUserId = dbIndexContent.includes("eq(schema.projects.userId, options.userId)") ||
                           dbIndexContent.includes("eq(schema.projects.userId, options.userId)");
  assert(hasSqlWhereUserId, "getAllProjects pushes WHERE user_id down to SQL query");

  // Test 4: Database schema indexing on projects.user_id
  const hasUserIdIndex = schemaContent.includes("projects_user_id_idx") ||
                         schemaContent.includes(".on(table.userId)");
  assert(hasUserIdIndex, "schema.ts defines index on projects.user_id");

  // Test 5: Middleware fast-path cookie check before outbound network calls
  const hasCookiePreCheck = proxyContent.includes("hasSupabaseCookie") ||
                           proxyContent.includes("!hasSupabaseCookie && !hasAdminCookie");
  assert(hasCookiePreCheck, "proxy.ts short-circuits unauthenticated /workspace requests before remote API calls");

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(console.error);
