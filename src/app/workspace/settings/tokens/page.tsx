import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listUserApiTokens } from "@/lib/tokens";
import TokensClient from "./tokens-client";

export const dynamic = "force-dynamic";

export default async function ApiTokensPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?from=/workspace/settings/tokens");
  }

  const tokens = await listUserApiTokens(user.id);

  return <TokensClient initialTokens={tokens} userRole={user.role} />;
}
