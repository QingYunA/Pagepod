import { assertSafeStoragePath, assertSafeStorageKey, UnsafePathError } from "../src/lib/storage/path-safety";
import { sanitizeRedirectPath, sanitizeNextParam } from "../src/lib/safe-redirect";
import { canManageProject, type CurrentUser } from "../src/lib/auth";
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

function assertThrows(fn: () => void, name: string) {
  try {
    fn();
    failed++;
    console.error(`  ✗ FAIL (did not throw): ${name}`);
  } catch (err) {
    if (err instanceof UnsafePathError) {
      passed++;
      console.log(`  ✓ ${name}`);
    } else {
      failed++;
      console.error(`  ✗ FAIL (wrong error type): ${name}`, err);
    }
  }
}

console.log("\n=== 1. Storage Path Containment Tests ===");
assertThrows(() => assertSafeStoragePath("/tmp/storage", "../etc/passwd"), "Rejects parent directory ..");
assertThrows(() => assertSafeStoragePath("/tmp/storage", "foo/../../etc/passwd"), "Rejects nested traversal");
assertThrows(() => assertSafeStoragePath("/tmp/storage", "foo\0bar"), "Rejects null bytes");
assertThrows(() => assertSafeStorageKey("sites/../../etc/passwd", "sites"), "Rejects traversal in storage key");
assertThrows(() => assertSafeStorageKey("other/file.html", "sites"), "Enforces required sites/ prefix");

const safeResolved = assertSafeStoragePath("/tmp/storage", "sites/abc12345/index.html");
assert(safeResolved.startsWith("/tmp/storage/sites/abc12345/index.html"), "Allows valid storage path");

const safeKey = assertSafeStorageKey("sites/my-slug/index.html", "sites");
assert(safeKey === "sites/my-slug/index.html", "Allows canonical storage key under sites/");

console.log("\n=== 2. Open Redirect Sanitization Tests ===");
assert(sanitizeRedirectPath("https://evil.com") === "/workspace", "Rejects absolute https:// URL");
assert(sanitizeRedirectPath("//evil.com") === "/workspace", "Rejects protocol-relative // URL");
assert(sanitizeRedirectPath("/\\evil.com") === "/workspace", "Rejects /\\ backslash trick");
assert(sanitizeRedirectPath("javascript:alert(1)") === "/workspace", "Rejects javascript: scheme");
assert(sanitizeRedirectPath("/admin") === "/workspace", "Normalizes legacy /admin to /workspace");
assert(sanitizeRedirectPath("/admin/projects") === "/workspace/projects", "Normalizes /admin/projects to /workspace/projects");
assert(sanitizeRedirectPath("/workspace/upload") === "/workspace/upload", "Allows safe relative /workspace/upload");
assert(sanitizeRedirectPath("/p/my-slug") === "/p/my-slug", "Allows safe relative /p/my-slug");
assert(sanitizeNextParam("@evil.com") === "/workspace", "Rejects @userinfo redirect trick");
assert(sanitizeNextParam("/explore") === "/explore", "Allows safe /explore");

console.log("\n=== 3. Project Authorization (IDOR) Tests ===");
const superAdmin: CurrentUser = { id: "selfhost-admin", role: "admin" };
const cloudAdmin: CurrentUser = { id: "user_admin", role: "admin" };
const ownerUser: CurrentUser = { id: "user_alice", role: "user" };
const otherUser: CurrentUser = { id: "user_bob", role: "user" };

const aliceProject = { id: "p1", userId: "user_alice" };
const legacyNoUserProject = { id: "p2", userId: null };

assert(canManageProject(superAdmin, aliceProject), "Selfhost admin can manage any project");
assert(canManageProject(cloudAdmin, aliceProject), "Cloud admin can manage any project");
assert(canManageProject(ownerUser, aliceProject), "Owner can manage own project");
assert(!canManageProject(otherUser, aliceProject), "Other user CANNOT manage Alice's project (IDOR blocked)");
assert(!canManageProject(ownerUser, legacyNoUserProject), "Regular user cannot manage legacy unclaimed project");
assert(canManageProject(superAdmin, legacyNoUserProject), "Admin can manage legacy unclaimed project");
assert(!canManageProject(null, aliceProject), "Guest cannot manage project");

console.log("\n=== 4. Fallback Data Isolation & Privacy Tests ===");
const isolatedAlice = await getAllProjects({ userId: "user_alice" });
assert(isolatedAlice.every((p) => p.userId === "user_alice"), "Fallback query: Alice only sees projects with userId === user_alice");
const isolatedBob = await getAllProjects({ userId: "user_bob_isolated_empty" });
assert(isolatedBob.length === 0, "Fallback query: Non-existent user query returns empty array (zero tenant leak)");
const publicOnly = await getAllProjects({ includePrivate: false });
assert(publicOnly.every((p) => p.visibility === "public"), "Fallback query: Public filter never leaks private or unlisted projects");

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
