/**
 * PayPal REST API v2 Client for One-Time Lifetime Deals
 * Zero-dependency, native fetch implementation compatible with Node.js, Bun, and Edge runtimes.
 */

interface PayPalTokenCache {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
}

let cachedToken: PayPalTokenCache | null = null;

export const PLAN_PRICING = {
  lite: {
    tier: "lite" as const,
    name: "Pagepod Lite Lifetime Deal",
    amount: "3.90",
    originalAmount: "4.90",
    currency: "USD",
  },
  pro: {
    tier: "pro" as const,
    name: "Pagepod Pro Lifetime Deal",
    amount: "7.90",
    originalAmount: "9.90",
    currency: "USD",
  },
};

export type PlanTier = keyof typeof PLAN_PRICING;

function getPayPalConfig() {
  const mode = process.env.PAYPAL_MODE || "sandbox";
  const isSandbox = mode !== "live" && mode !== "production";
  const baseUrl = isSandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  const clientId =
    process.env.PAYPAL_CLIENT_ID ||
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    "";
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || "";

  return { isSandbox, baseUrl, clientId, clientSecret };
}

/**
 * Retrieve OAuth 2.0 Bearer Access Token with automatic in-memory caching.
 */
export async function getPayPalAccessToken(): Promise<string> {
  const { baseUrl, clientId, clientSecret } = getPayPalConfig();

  if (!clientId || !clientSecret) {
    throw new Error(
      "PayPal API credentials missing. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET."
    );
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.accessToken;
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("PayPal token request failed:", res.status, errorBody);
    throw new Error(`Failed to obtain PayPal access token: ${res.statusText}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return cachedToken.accessToken;
}

/**
 * Create PayPal Checkout Order for one-time payment.
 */
export async function createPayPalOrder(params: {
  planTier: "lite" | "pro";
  userId: string;
  userEmail?: string;
}): Promise<{
  id: string;
  status: string;
  amount: string;
  planTier: "lite" | "pro";
}> {
  const { baseUrl } = getPayPalConfig();
  const token = await getPayPalAccessToken();

  const plan = PLAN_PRICING[params.planTier];
  if (!plan) {
    throw new Error(`Invalid plan tier: ${params.planTier}`);
  }

  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: `pu_${Date.now()}`,
        description: plan.name,
        custom_id: `${params.userId}:${params.planTier}`,
        amount: {
          currency_code: plan.currency,
          value: plan.amount,
        },
      },
    ],
    application_context: {
      brand_name: "Pagepod",
      shipping_preference: "NO_SHIPPING",
      user_action: "PAY_NOW",
    },
  };

  const res = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("PayPal create order failed:", res.status, errorText);
    throw new Error(`Failed to create PayPal order: ${res.statusText}`);
  }

  const data = (await res.json()) as { id: string; status: string };
  return {
    id: data.id,
    status: data.status,
    amount: plan.amount,
    planTier: params.planTier,
  };
}

/**
 * Capture payment for an approved PayPal order.
 */
export async function capturePayPalOrder(paypalOrderId: string): Promise<{
  success: boolean;
  status: string;
  captureId?: string;
  payerEmail?: string;
  customId?: string;
  raw: unknown;
}> {
  const { baseUrl } = getPayPalConfig();
  const token = await getPayPalAccessToken();

  const res = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = (await res.json()) as {
    status?: string;
    payer?: { email_address?: string };
    purchase_units?: Array<{
      payments?: {
        captures?: Array<{ id?: string; status?: string }>;
      };
      custom_id?: string;
    }>;
  };

  if (!res.ok) {
    console.error("PayPal capture order failed:", res.status, data);
    return {
      success: false,
      status: data.status || "FAILED",
      raw: data,
    };
  }

  const isCompleted = data.status === "COMPLETED";
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  const customId = data.purchase_units?.[0]?.custom_id;

  return {
    success: isCompleted,
    status: data.status || "UNKNOWN",
    captureId: capture?.id,
    payerEmail: data.payer?.email_address,
    customId,
    raw: data,
  };
}
