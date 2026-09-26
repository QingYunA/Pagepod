import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, isCloudMode } from "@/lib/supabase/server";
import type { UserIdentity } from "@supabase/supabase-js";
import SettingsClient from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?from=/workspace/settings");
  }

  const cloud = isCloudMode();
  let identities: UserIdentity[] = [];
  let hasPassword = false;

  if (cloud) {
    try {
      const supabase = await createSupabaseServerClient();
      if (supabase) {
        const {
          data: { user: sbUser },
        } = await supabase.auth.getUser();
        if (sbUser) {
          identities = sbUser.identities || [];
          hasPassword = Boolean(
            sbUser.identities?.some((i) => i.provider === "email") ||
              sbUser.app_metadata?.providers?.includes("email")
          );
        }
      }
    } catch {
      // Non-fatal, fallback to empty identities
    }
  }

  return (
    <SettingsClient
      user={user}
      initialIdentities={identities}
      initialHasPassword={hasPassword}
      isCloud={cloud}
    />
  );
}
