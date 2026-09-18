import { nanoid } from "nanoid";
import {
  createPayPalOrder,
  capturePayPalOrder,
  PLAN_PRICING,
  type PlanTier,
} from "@/lib/paypal";
import {
  createOrderRecord,
  getOrderByPayPalId,
  completeOrderRecord,
  getUserProjectsCount,
  getOrderById,
  getOrderByWaffoSessionId,
  completeWaffoOrderRecord,
  isWebhookDeliveryProcessed,
  recordWebhookDelivery,
} from "@/db";
import {
  createWaffoCheckoutSession,
  verifyWaffoWebhookSignature,
  WAFFO_PRODUCTS,
  type WaffoPlanTier,
} from "@/lib/waffo";
import type { CurrentUser } from "@/lib/auth";
import {
  ProjectForbiddenError,
  ProjectPayloadTooLargeError,
  ProjectValidationError,
  ProjectNotFoundError,
} from "./project-service";
import { isSelfHosted } from "@/lib/supabase/server";

export const MAX_SELFHOST_UPLOAD_BYTES =
  Number(process.env.MAX_UPLOAD_SIZE) || 100 * 1024 * 1024; // 100MB default for selfhost

export interface PlanEntitlement {
  tier: "free" | "lite" | "pro";
  name: string;
  maxProjects: number;
  maxFileSizeBytes: number;
}

export const PLAN_ENTITLEMENTS: Record<"free" | "lite" | "pro", PlanEntitlement> = {
  free: {
    tier: "free",
    name: "Free",
    maxProjects: 20,
    maxFileSizeBytes: 2 * 1024 * 1024, // 2MB
  },
  lite: {
    tier: "lite",
    name: "Lite",
    maxProjects: 500,
    maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
  },
  pro: {
    tier: "pro",
    name: "Pro",
    maxProjects: Infinity,
    maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
  },
};

/**
 * Validates whether a user is entitled to create a project with the given size.
 * Enforces project count and payload size limits based on plan tier.
 */
export async function assertCanCreateProject(
  user: CurrentUser,
  fileSizeBytes?: number
): Promise<void> {
  // In self-hosted mode, users possess sovereign unconstrained limits
  if (isSelfHosted() || user.id === "selfhost-admin" || user.role === "admin") {
    if (fileSizeBytes !== undefined && fileSizeBytes > MAX_SELFHOST_UPLOAD_BYTES) {
      const maxMb = Math.round(MAX_SELFHOST_UPLOAD_BYTES / (1024 * 1024));
      throw new ProjectPayloadTooLargeError(
        `File size exceeds maximum server limit (${maxMb}MB).`
      );
    }
    return;
  }

  const tier = user.planTier || "free";
  const entitlement = PLAN_ENTITLEMENTS[tier] || PLAN_ENTITLEMENTS.free;

  // 1. File size limit
  if (fileSizeBytes !== undefined && fileSizeBytes > entitlement.maxFileSizeBytes) {
    const maxMb = entitlement.maxFileSizeBytes / (1024 * 1024);
    throw new ProjectPayloadTooLargeError(
      `File size exceeds your plan limit (${maxMb}MB for ${entitlement.name} tier). Please upgrade to upload larger files.`
    );
  }

  // 2. Project count limit
  const currentCount = await getUserProjectsCount(user.id);
  if (currentCount >= entitlement.maxProjects) {
    throw new ProjectForbiddenError(
      `Project quota reached (${currentCount}/${entitlement.maxProjects} for ${entitlement.name} tier). Please upgrade to create more projects.`
    );
  }
}

/**
 * Initiates a checkout order with PayPal and registers the pending order.
 */
export async function createCheckoutOrder(
  user: CurrentUser,
  planTier: string
): Promise<{ orderId: string; planTier: PlanTier; amount: string }> {
  if (isSelfHosted()) {
    throw new ProjectForbiddenError("Commercial payment is disabled in self-hosted mode");
  }

  if (!user || !user.id) {
    throw new ProjectForbiddenError("Authentication required to initiate checkout");
  }

  if (!planTier || !(planTier in PLAN_PRICING)) {
    throw new ProjectValidationError("Invalid or missing plan tier. Supported: 'lite', 'pro'");
  }

  const tier = planTier as PlanTier;
  const paypalOrder = await createPayPalOrder({
    planTier: tier,
    userId: user.id,
    userEmail: user.email,
  });

  await createOrderRecord({
    id: `ord_${nanoid(16)}`,
    userId: user.id,
    userEmail: user.email || null,
    planTier: tier,
    amount: paypalOrder.amount,
    currency: "USD",
    status: "created",
    paypalOrderId: paypalOrder.id,
  });

  return {
    orderId: paypalOrder.id,
    planTier: tier,
    amount: paypalOrder.amount,
  };
}

/**
 * Captures a PayPal order, enforces IDOR authorization and idempotency,
 * and completes the user's plan upgrade.
 */
export async function captureCheckoutOrder(
  user: CurrentUser,
  orderId: string
): Promise<{ success: boolean; orderId: string; captureId?: string; planTier: string; alreadyCompleted?: boolean }> {
  if (isSelfHosted()) {
    throw new ProjectForbiddenError("Commercial payment is disabled in self-hosted mode");
  }

  if (!user || !user.id) {
    throw new ProjectForbiddenError("Authentication required to capture payment");
  }

  if (!orderId || typeof orderId !== "string") {
    throw new ProjectValidationError("Invalid or missing orderId");
  }

  // 1. Verify order exists in our system
  const localOrder = await getOrderByPayPalId(orderId);
  if (!localOrder) {
    throw new ProjectNotFoundError("Order record not found");
  }

  // 2. Strict IDOR protection: only the ordering user (or platform admin) can capture
  if (localOrder.userId !== user.id && user.role !== "admin") {
    throw new ProjectForbiddenError("Forbidden: You are not authorized to capture this order");
  }

  // 3. Short-circuit idempotency: if already completed, return success without re-capturing
  if (localOrder.status === "completed") {
    return {
      success: true,
      orderId,
      captureId: localOrder.paypalCaptureId || undefined,
      planTier: localOrder.planTier,
      alreadyCompleted: true,
    };
  }

  // 4. Capture payment with PayPal
  const captureResult = await capturePayPalOrder(orderId);
  if (!captureResult.success) {
    throw new ProjectValidationError(`PayPal payment was not completed: ${captureResult.status}`);
  }

  // 5. Mark order as completed and upgrade user subscription
  const updated = await completeOrderRecord(
    orderId,
    captureResult.captureId || `cap_${Date.now()}`
  );

  return {
    success: true,
    orderId,
    captureId: captureResult.captureId,
    planTier: updated?.planTier || localOrder?.planTier || "lite",
  };
}

/**
 * Initiates a Waffo Pancake hosted checkout order for a lifetime plan tier.
 */
export async function createWaffoCheckoutOrder(
  user: CurrentUser,
  planTier: string,
  successUrl?: string
): Promise<{
  orderId: string;
  sessionId: string;
  checkoutUrl: string;
  planTier: "lite" | "pro";
  amount: string;
  expiresAt?: string;
}> {
  if (isSelfHosted()) {
    throw new ProjectForbiddenError("Commercial payment is disabled in self-hosted mode");
  }

  if (!user || !user.id) {
    throw new ProjectForbiddenError("Authentication required to initiate checkout");
  }

  if (!planTier || !(planTier in WAFFO_PRODUCTS)) {
    throw new ProjectValidationError("Invalid or missing plan tier. Supported: 'lite', 'pro'");
  }

  const tier = planTier as WaffoPlanTier;
  const localOrderId = `ord_${nanoid(16)}`;

  const session = await createWaffoCheckoutSession({
    planTier: tier,
    userId: user.id,
    userEmail: user.email || undefined,
    orderId: localOrderId,
    successUrl,
  });

  await createOrderRecord({
    id: localOrderId,
    userId: user.id,
    userEmail: user.email || null,
    planTier: tier,
    amount: session.amount,
    currency: "USD",
    status: "created",
    provider: "waffo",
    waffoSessionId: session.sessionId,
  });

  return {
    orderId: localOrderId,
    sessionId: session.sessionId,
    checkoutUrl: session.checkoutUrl,
    planTier: tier,
    amount: session.amount,
    expiresAt: session.expiresAt,
  };
}

/**
 * Handles incoming Waffo Pancake webhook deliveries with RSA verification and deduplication.
 */
export async function processWaffoWebhook(
  rawBody: string,
  signature: string
): Promise<{ success: boolean; eventType?: string; orderId?: string; duplicated?: boolean }> {
  const event = verifyWaffoWebhookSignature(rawBody, signature);

  if (!event || !event.id) {
    throw new ProjectValidationError("Invalid Waffo webhook payload structure");
  }

  // Deduplication check
  const alreadyProcessed = await isWebhookDeliveryProcessed(event.id);
  if (alreadyProcessed) {
    return { success: true, eventType: event.eventType, duplicated: true };
  }

  const eventType = event.eventType;
  let targetOrderId: string | undefined;

  if (
    eventType === "order.completed" ||
    eventType === "subscription.activated"
  ) {
    const data = event.data as Record<string, any> | undefined;
    const localOrderId =
      data?.orderMetadata?.orderId ||
      data?.orderMerchantExternalId;
    const waffoOrderId = (data?.orderId as string) || event.eventId || `waffo_${Date.now()}`;
    const waffoSessionId = data?.sessionId as string | undefined;

    const lookupKey = localOrderId || waffoSessionId || waffoOrderId;
    if (lookupKey) {
      const completedOrder = await completeWaffoOrderRecord(lookupKey, waffoOrderId);
      if (completedOrder) {
        targetOrderId = completedOrder.id;
      } else {
        // Enforce local order existence: do NOT mark delivery processed so upstream can retry
        throw new ProjectNotFoundError(`Target order not found in local records for: ${lookupKey}`);
      }
    } else {
      throw new ProjectValidationError("Missing order identifier in webhook payload");
    }
  }

  // Record delivery record only after successful order processing
  await recordWebhookDelivery(event.id, eventType, "waffo");

  return {
    success: true,
    eventType,
    orderId: targetOrderId,
    duplicated: false,
  };
}

/**
 * Verifies user ownership (IDOR defense) and returns the current payment status of a Waffo order.
 */
export async function getWaffoOrderStatus(
  user: CurrentUser,
  orderIdOrSessionId: string
): Promise<{
  orderId: string;
  sessionId: string | null;
  status: string;
  planTier: string;
  completed: boolean;
}> {
  if (isSelfHosted()) {
    throw new ProjectForbiddenError("Commercial payment is disabled in self-hosted mode");
  }

  if (!user || !user.id) {
    throw new ProjectForbiddenError("Authentication required to check order status");
  }

  if (!orderIdOrSessionId || typeof orderIdOrSessionId !== "string") {
    throw new ProjectValidationError("Invalid or missing orderIdOrSessionId");
  }

  // 1. Verify order exists
  let localOrder = await getOrderById(orderIdOrSessionId);
  if (!localOrder) {
    localOrder = await getOrderByWaffoSessionId(orderIdOrSessionId);
  }
  if (!localOrder) {
    throw new ProjectNotFoundError("Order record not found");
  }

  // 2. Strict IDOR protection: only the ordering user or admin can view status
  if (localOrder.userId !== user.id && user.role !== "admin") {
    throw new ProjectForbiddenError("Forbidden: You are not authorized to access this order");
  }

  return {
    orderId: localOrder.id,
    sessionId: localOrder.waffoSessionId,
    status: localOrder.status,
    planTier: localOrder.planTier,
    completed: localOrder.status === "completed",
  };
}

