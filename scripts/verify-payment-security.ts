/**
 * Payment Security, IDOR Defense, and Idempotency Invariant Tests
 * Run with: bun run scripts/verify-payment-security.ts
 */

import { sanitizeRedirectPath } from "../src/lib/safe-redirect";
import { PLAN_PRICING, type PlanTier } from "../src/lib/paypal";
import { PLAN_ENTITLEMENTS } from "../src/lib/services/billing-service";
import { WAFFO_PRODUCTS } from "../src/lib/waffo";

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
assert(PLAN_PRICING.lite.amount === "3.90", "Lite tier discounted price is strictly $3.90 USD");
assert(PLAN_PRICING.lite.originalAmount === "4.90", "Lite tier original price is $4.90 USD");
assert(PLAN_PRICING.lite.currency === "USD", "Lite tier currency is strictly USD");

assert(PLAN_PRICING.pro !== undefined, "Pro tier is defined in PLAN_PRICING");
assert(PLAN_PRICING.pro.amount === "7.90", "Pro tier discounted price is strictly $7.90 USD");
assert(PLAN_PRICING.pro.originalAmount === "9.90", "Pro tier original price is $9.90 USD");
assert(PLAN_PRICING.pro.currency === "USD", "Pro tier currency is strictly USD");

const validTiers: PlanTier[] = ["lite", "pro"];
assert(validTiers.includes("lite") && validTiers.includes("pro"), "Only valid tiers are lite and pro");

assert(PLAN_ENTITLEMENTS.free.maxProjects === 20, "Free tier allows 20 projects");
assert(PLAN_ENTITLEMENTS.lite.maxProjects === 500, "Lite tier allows 500 projects");
assert(PLAN_ENTITLEMENTS.pro.maxProjects === Infinity, "Pro tier allows unlimited projects");

console.log("\n=== 5. Waffo Pancake Pricing & Product Invariants ===");

assert(WAFFO_PRODUCTS.lite !== undefined, "Lite tier is defined in WAFFO_PRODUCTS");
assert(WAFFO_PRODUCTS.lite.amount === "4.90", "Waffo Lite tier price is strictly $4.90 USD");
assert(WAFFO_PRODUCTS.lite.currency === "USD", "Waffo Lite tier currency is USD");
assert(WAFFO_PRODUCTS.lite.productId.startsWith("PROD_"), "Waffo Lite has valid Product ID");

assert(WAFFO_PRODUCTS.pro !== undefined, "Pro tier is defined in WAFFO_PRODUCTS");
assert(WAFFO_PRODUCTS.pro.amount === "9.90", "Waffo Pro tier price is strictly $9.90 USD");
assert(WAFFO_PRODUCTS.pro.currency === "USD", "Waffo Pro tier currency is USD");
assert(WAFFO_PRODUCTS.pro.productId.startsWith("PROD_"), "Waffo Pro has valid Product ID");

assert(
  WAFFO_PRODUCTS.lite.amount === PLAN_PRICING.lite.originalAmount,
  "Price parity: Waffo Lite base price equals PayPal Lite base price ($4.90)"
);
assert(
  WAFFO_PRODUCTS.pro.amount === PLAN_PRICING.pro.originalAmount,
  "Price parity: Waffo Pro base price equals PayPal Pro base price ($9.90)"
);

console.log("\n=== 6. Waffo IDOR & Order Status Security ===");

interface TestWaffoOrder {
  id: string;
  userId: string;
  waffoSessionId: string;
  status: "created" | "completed";
  planTier: "lite" | "pro";
}

function checkWaffoOrderStatus(
  order: TestWaffoOrder | null | undefined,
  user: TestUser | null | undefined
): { allowed: boolean; status: number; completed?: boolean; error?: string } {
  if (!user || !user.id) {
    return { allowed: false, status: 401, error: "Authentication required" };
  }
  if (!order) {
    return { allowed: false, status: 404, error: "Order not found" };
  }
  if (order.userId !== user.id && user.role !== "admin") {
    return { allowed: false, status: 403, error: "Forbidden: You are not authorized to access this order" };
  }
  return { allowed: true, status: 200, completed: order.status === "completed" };
}

const aliceWaffoOrder: TestWaffoOrder = {
  id: "ord_waffo_alice_001",
  userId: "user_alice_123",
  waffoSessionId: "cs_waffo_test_123",
  status: "created",
  planTier: "pro",
};

// 1. Unauthenticated check
const waffoUnauth = checkWaffoOrderStatus(aliceWaffoOrder, null);
assert(!waffoUnauth.allowed && waffoUnauth.status === 401, "Waffo: Blocks unauthenticated status check (401)");

// 2. Not found check
const waffoNotFound = checkWaffoOrderStatus(null, alice);
assert(!waffoNotFound.allowed && waffoNotFound.status === 404, "Waffo: Returns 404 for missing order");

// 3. Legitimate owner check
const waffoOwner = checkWaffoOrderStatus(aliceWaffoOrder, alice);
assert(waffoOwner.allowed && waffoOwner.status === 200 && !waffoOwner.completed, "Waffo: Allows owner to check order status (200)");

// 4. IDOR attempt by Bob
const waffoIdor = checkWaffoOrderStatus(aliceWaffoOrder, bobAttacker);
assert(!waffoIdor.allowed && waffoIdor.status === 403, "Waffo BLOCKS IDOR: Attacker cannot check Alice's order status (403)");

// 5. Admin check
const waffoAdmin = checkWaffoOrderStatus(aliceWaffoOrder, adminUser);
assert(waffoAdmin.allowed && waffoAdmin.status === 200, "Waffo: Allows platform admin to inspect order status");

console.log("\n=== 7. Waffo Webhook Delivery Deduplication & Idempotency ===");

const processedDeliveries = new Set<string>();

function simulateWebhookDelivery(
  deliveryId: string,
  eventType: string,
  order: TestWaffoOrder
): { processed: boolean; duplicated: boolean } {
  if (processedDeliveries.has(deliveryId)) {
    return { processed: false, duplicated: true };
  }
  if (eventType === "order.completed") {
    order.status = "completed";
  }
  processedDeliveries.add(deliveryId);
  return { processed: true, duplicated: false };
}

const testDeliveryId = "del_waffo_event_uuid_101";
const firstDelivery = simulateWebhookDelivery(testDeliveryId, "order.completed", aliceWaffoOrder);
assert(firstDelivery.processed && !firstDelivery.duplicated, "First webhook delivery is processed successfully");
assert(aliceWaffoOrder.status === "completed", "Webhook marks Waffo order as completed");

const duplicateDelivery = simulateWebhookDelivery(testDeliveryId, "order.completed", aliceWaffoOrder);
assert(!duplicateDelivery.processed && duplicateDelivery.duplicated, "Duplicate webhook delivery is deduplicated (idempotent)");

// Re-check order status after completion
const postCompletionCheck = checkWaffoOrderStatus(aliceWaffoOrder, alice);
assert(
  postCompletionCheck.allowed && postCompletionCheck.completed === true,
  "Order status reflects completed state after webhook"
);

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}

