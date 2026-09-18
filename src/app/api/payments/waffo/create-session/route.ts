import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createWaffoCheckoutOrder } from "@/lib/services/billing-service";
import { ProjectDomainError } from "@/lib/services/project-service";
import { isSelfHosted } from "@/lib/supabase/server";

export async function POST(req: Request) {
  if (isSelfHosted()) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to initiate checkout" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { planTier, successUrl } = body as { planTier?: string; successUrl?: string };

    // Strict same-origin validation for successUrl to prevent open redirects
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.pagepod.dev";
    let validatedSuccessUrl = `${siteUrl}/pricing?tier=${planTier || "lite"}&status=completed`;
    if (typeof successUrl === "string" && successUrl.trim()) {
      try {
        const parsed = new URL(successUrl, siteUrl);
        const expectedOrigin = new URL(siteUrl).origin;
        if (parsed.origin === expectedOrigin && !successUrl.startsWith("//")) {
          validatedSuccessUrl = parsed.toString();
        }
      } catch {
        // Fallback to secure default
      }
    }

    const result = await createWaffoCheckoutOrder(user, planTier || "", validatedSuccessUrl);
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof ProjectDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("Error creating Waffo checkout session:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
