/**
 * Waffo Pancake Payment Gateway Client & Helper Utilities
 * Official SDK: @waffo/pancake-ts
 * Supports One-Time Lifetime Deals & Checkout Sessions
 */

import {
  WaffoPancake,
  verifyWebhook,
  WebhookEventType,
  type WebhookEvent,
} from "@waffo/pancake-ts";

export { WebhookEventType, type WebhookEvent };

export const WAFFO_PRODUCTS = {
  lite: {
    tier: "lite" as const,
    name: "Pagepod Lite Lifetime Deal",
    productId: process.env.WAFFO_PROD_LITE_ID || "PROD_1bH5KadMHylrRe400OYbRD",
    amount: "4.90",
    currency: "USD",
  },
  pro: {
    tier: "pro" as const,
    name: "Pagepod Pro Lifetime Deal",
    productId: process.env.WAFFO_PROD_PRO_ID || "PROD_4thgHLWRM3rmPX01a5eYSR",
    amount: "9.90",
    currency: "USD",
  },
};

export type WaffoPlanTier = keyof typeof WAFFO_PRODUCTS;

function formatPemKey(rawKey: string): string {
  if (!rawKey) return "";
  const cleaned = rawKey.replace(/\\n/g, "\n").trim();
  if (cleaned.includes("BEGIN PRIVATE KEY") || cleaned.includes("BEGIN RSA PRIVATE KEY")) {
    return cleaned;
  }
  const base64 = cleaned.replace(/\s+/g, "");
  const wrapped = base64.match(/.{1,64}/g)?.join("\n") || base64;
  return `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----`;
}

export function getWaffoConfig() {
  const environment = (process.env.WAFFO_ENVIRONMENT as "test" | "prod") || "test";
  const merchantId = process.env.WAFFO_MERCHANT_ID || "MER_39eInAPdm3tF3TfUVkZyBx";
  const storeId = process.env.WAFFO_STORE_ID || "STO_6287oATdyYUEIh6LvSDKZE";
  const rawKey = process.env.WAFFO_PRIVATE_KEY || "";
  const privateKey = formatPemKey(rawKey);

  return { environment, merchantId, storeId, privateKey };
}

let waffoClientInstance: WaffoPancake | null = null;

export function getWaffoClient(): WaffoPancake {
  if (waffoClientInstance) {
    return waffoClientInstance;
  }

  const { merchantId, privateKey, environment } = getWaffoConfig();

  if (!merchantId || !privateKey) {
    throw new Error(
      "Waffo Pancake credentials missing. Please configure WAFFO_MERCHANT_ID and WAFFO_PRIVATE_KEY."
    );
  }

  waffoClientInstance = new WaffoPancake({
    merchantId,
    privateKey,
    environment,
  });

  return waffoClientInstance;
}

/**
 * Creates a Waffo Pancake hosted checkout session for a one-time product lifetime plan.
 */
export async function createWaffoCheckoutSession(params: {
  planTier: "lite" | "pro";
  userId: string;
  userEmail?: string;
  orderId: string;
  successUrl?: string;
}): Promise<{
  sessionId: string;
  checkoutUrl: string;
  expiresAt?: string;
  planTier: "lite" | "pro";
  amount: string;
}> {
  const client = getWaffoClient();
  const product = WAFFO_PRODUCTS[params.planTier];
  if (!product) {
    throw new Error(`Invalid plan tier: ${params.planTier}`);
  }

  const session = await client.checkout.createSession({
    productId: product.productId,
    currency: product.currency,
    buyerEmail: params.userEmail,
    successUrl: params.successUrl,
    orderMerchantExternalId: params.orderId,
    metadata: {
      orderId: params.orderId,
      userId: params.userId,
      planTier: params.planTier,
    },
    darkMode: true,
  });

  return {
    sessionId: session.sessionId,
    checkoutUrl: session.checkoutUrl,
    expiresAt: session.expiresAt,
    planTier: params.planTier,
    amount: product.amount,
  };
}

/**
 * Verifies RSA-SHA256 signature on an incoming Waffo Pancake webhook.
 * Expects the raw request body string.
 */
export function verifyWaffoWebhookSignature(
  rawBody: string,
  signature: string,
  env?: "test" | "prod"
): WebhookEvent {
  const environment = env || (process.env.WAFFO_ENVIRONMENT as "test" | "prod") || "test";
  return verifyWebhook(rawBody, signature, { environment });
}
