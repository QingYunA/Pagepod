import { NextResponse } from "next/server";
import { processWaffoWebhook } from "@/lib/services/billing-service";
import { isSelfHosted } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (isSelfHosted()) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const signature =
    req.headers.get("x-waffo-signature") ||
    req.headers.get("X-Waffo-Signature") ||
    "";

  if (!signature) {
    return NextResponse.json(
      { error: "Missing x-waffo-signature header" },
      { status: 400 }
    );
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err) {
    console.error("Failed to read Waffo webhook raw body:", err);
    return NextResponse.json(
      { error: "Unable to read request body" },
      { status: 400 }
    );
  }

  try {
    const result = await processWaffoWebhook(rawBody, signature);
    return NextResponse.json({
      received: true,
      ...result,
    });
  } catch (err: unknown) {
    console.error("Waffo webhook verification / processing error:", err);
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
