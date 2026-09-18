import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getWaffoOrderStatus } from "@/lib/services/billing-service";
import { ProjectDomainError } from "@/lib/services/project-service";
import { isSelfHosted } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (isSelfHosted()) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to check order status" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const orderIdOrSessionId =
      searchParams.get("orderId") || searchParams.get("sessionId") || "";

    const result = await getWaffoOrderStatus(user, orderIdOrSessionId);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    if (err instanceof ProjectDomainError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("Error checking Waffo order status:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
