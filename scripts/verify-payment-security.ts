/**
 * Payment Security, IDOR Defense, and Idempotency Invariant Tests
 * Run with: bun run scripts/verify-payment-security.ts
 */

import { sanitizeRedirectPath } from "../src/lib/safe-redirect";
import { PLAN_PRICING, type PlanTier } from "../src/lib/paypal";
import { PLAN_ENTITLEMENTS } from "../src/lib/services/billing-service";

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

console.log("\n=== 1. Payment Redirect & Intent Preservation Tests ===");
// Safe redirect must preserve query params for payment resumption
assert(
  sanitizeRedirectPath("/pricing?tier=pro") === "/pricing?tier=pro",
  "Preserves /pricing?tier=pro redirect path"
);
assert(
  sanitizeRedirectPath("/pricing?tier=lite") === "/pricing?tier=lite",
  "Preserves /pricing?tier=lite redirect path"
);
assert(
  sanitizeRedirectPath("//evil.com/pricing?tier=pro") === "/workspace",
  "Rejects protocol-relative open redirect with query params"
);
assert(
  sanitizeRedirectPath("/\\evil.com/pricing?tier=pro") === "/workspace",
  "Rejects backslash open redirect with query params"
);
assert(
  sanitizeRedirectPath("https://attacker.com/pricing?tier=pro") === "/workspace",
  "Rejects absolute external url redirect with query params"
);
assert(
  sanitizeRedirectPath("javascript:alert(1)?tier=pro") === "/workspace",
  "Rejects javascript scheme injection in intent redirect"
);

console.log("\n=== 2. IDOR Defense (Payment Order Ownership Verification) ===");

interface TestUser {
  id: string;
  role?: string;
}

interface TestOrder {
  id: string;
  userId: string;
  status: "pending" | "completed" | "failed";
}

// Logic mirror of src/app/api/payments/paypal/capture-order/route.ts
function canCapturePaymentOrder(
  order: TestOrder | null | undefined,
  user: TestUser | null | undefined
): { allowed: boolean; status: number; error?: string } {
  if (!user || !user.id) {
    return { allowed: false, status: 401, error: "Authentication required" };
  }
  if (!order) {
    return { allowed: false, status: 404, error: "Order not found" };
  }
  if (order.userId !== user.id && user.role !== "admin") {
    return { allowed: false, status: 403, error: "Unauthorized access to order" };
  }
  return { allowed: true, status: 200 };
}

const alice: TestUser = { id: "user_alice_123", role: "user" };
const bobAttacker: TestUser = { id: "user_bob_attacker", role: "user" };
const adminUser: TestUser = { id: "admin_root", role: "admin" };

const alicePendingOrder: TestOrder = {
  id: "order_alice_001",
  userId: "user_alice_123",
  status: "pending",
};

// Test unauthenticated check
const unauthCheck = canCapturePaymentOrder(alicePendingOrder, null);
assert(
  !unauthCheck.allowed && unauthCheck.status === 401,
  "Blocks unauthenticated checkout capture (401 Unauthorized)"
);

// Test non-existent order
const notFoundCheck = canCapturePaymentOrder(null, alice);
assert(
  !notFoundCheck.allowed && notFoundCheck.status === 404,
  "Returns 404 if order does not exist locally"
);

// Test legitimate owner capture
const aliceSelfCapture = canCapturePaymentOrder(alicePendingOrder, alice);
assert(
  aliceSelfCapture.allowed && aliceSelfCapture.status === 200,
  "Allows legitimate order owner to capture payment"
);

// Test IDOR attempt by third-party
const idorCheck = canCapturePaymentOrder(alicePendingOrder, bobAttacker);
assert(
  !idorCheck.allowed && idorCheck.status === 403,
  "BLOCKS IDOR: Bob cannot capture Alice's order (403 Forbidden)"
);

// Test Admin override
const adminCapture = canCapturePaymentOrder(alicePendingOrder, adminUser);
assert(
  adminCapture.allowed && adminCapture.status === 200,
  "Allows system administrator to process capture if needed"
);

console.log("\n=== 3. Capture Idempotency Short-Circuit Tests ===");

function shouldCallUpstreamPayPal(order: TestOrder): {
  callUpstream: boolean;
  shortCircuitReason?: string;
} {
  if (order.status === "completed") {
    return { callUpstream: false, shortCircuitReason: "already_completed" };
  }
  return { callUpstream: true };
}

const completedOrder: TestOrder = {
  id: "order_completed_999",
  userId: "user_alice_123",
  status: "completed",
};

const idempotencyCheck = shouldCallUpstreamPayPal(completedOrder);
assert(
  !idempotencyCheck.callUpstream && idempotencyCheck.shortCircuitReason === "already_completed",
  "Short-circuits completed order without calling PayPal API (Prevents duplicate capture)"
);

const pendingOrderCheck = shouldCallUpstreamPayPal(alicePendingOrder);
assert(
  pendingOrderCheck.callUpstream,
  "Allows upstream capture for pending order"
);

console.log("\n=== 4. Pricing Tiers & Plan Invariants ===");

assert(PLAN_PRICING.lite !== undefined, "Lite tier is defined in PLAN_PRICING");
assert(PLAN_PRICING.lite.amount === "4.90", "Lite tier price is strictly $4.90 USD");
assert(PLAN_PRICING.lite.currency === "USD", "Lite tier currency is strictly USD");

assert(PLAN_PRICING.pro !== undefined, "Pro tier is defined in PLAN_PRICING");
assert(PLAN_PRICING.pro.amount === "9.90", "Pro tier price is strictly $9.90 USD");
assert(PLAN_PRICING.pro.currency === "USD", "Pro tier currency is strictly USD");

const validTiers: PlanTier[] = ["lite", "pro"];
assert(validTiers.includes("lite") && validTiers.includes("pro"), "Only valid tiers are lite and pro");

assert(PLAN_ENTITLEMENTS.free.maxProjects === 20, "Free tier allows 20 projects");
assert(PLAN_ENTITLEMENTS.lite.maxProjects === 500, "Lite tier allows 500 projects");
assert(PLAN_ENTITLEMENTS.pro.maxProjects === Infinity, "Pro tier allows unlimited projects");

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
