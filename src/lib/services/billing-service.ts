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
} from "@/db";
import type { CurrentUser } from "@/lib/auth";
import {
  ProjectForbiddenError,
  ProjectPayloadTooLargeError,
  ProjectValidationError,
  ProjectNotFoundError,
} from "./project-service";

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
  const isAdmin = user.role === "admin" || user.id === "selfhost-admin";
  const tier = user.planTier || "free";
  const entitlement = PLAN_ENTITLEMENTS[tier] || PLAN_ENTITLEMENTS.free;

  // 1. File size limit
  if (fileSizeBytes !== undefined && fileSizeBytes > entitlement.maxFileSizeBytes) {
    const maxMb = entitlement.maxFileSizeBytes / (1024 * 1024);
    throw new ProjectPayloadTooLargeError(
      `File size exceeds your plan limit (${maxMb}MB for ${entitlement.name} tier). Please upgrade to upload larger files.`
    );
  }

  // Admins bypass project count limits
  if (isAdmin) return;

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
