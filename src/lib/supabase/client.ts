import { createBrowserClient } from "@supabase/ssr";

function cleanEnv(val?: string): string {
  if (!val) return "";
  return val
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/+$/, "");
}

export function createSupabaseClient() {
  const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export function isClientCloudMode(): boolean {
  const mode = cleanEnv(process.env.NEXT_PUBLIC_APP_MODE);
  const hasSupabase = Boolean(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
  return mode === "cloud" && hasSupabase;
}

export function isClientSelfHosted(): boolean {
  return !isClientCloudMode();
}
