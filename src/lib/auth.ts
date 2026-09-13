import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { getSetting, getUserPlanTier } from "@/db";
import { createSupabaseServerClient, isCloudMode } from "@/lib/supabase/server";
import { verifyAndConsumeToken } from "@/lib/tokens";
import { getJwtSecret, timingSafeEqualStrings } from "@/lib/secret-policy";

const COOKIE_NAME = "html_manager_session";

export async function getExpectedAdminPassword(): Promise<string> {
  const dbPassword = await getSetting("admin_password");
  if (dbPassword) return dbPassword;

  const envPwd = process.env.ADMIN_PASSWORD;
  if (envPwd) return envPwd;

  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  if (isProduction) {
    throw new Error(
      "[FATAL] ADMIN_PASSWORD is missing in production. Refusing to start with default password."
    );
  }

  return "admin888";
}

export async function verifyPassword(password: string): Promise<boolean> {
  try {
    const expected = await getExpectedAdminPassword();
    return timingSafeEqualStrings(password, expected);
  } catch {
    return false;
  }
}

export async function createAdminSessionToken(): Promise<string> {
  const secret = getJwtSecret();
  if (!secret) {
    throw new Error("Cannot create admin session: no JWT secret configured");
  }
  return await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyAdminSessionToken(token: string): Promise<boolean> {
  try {
    const secret = getJwtSecret();
    if (!secret) {
      return false;
    }
    const { payload } = await jwtVerify(token, secret);
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export interface CurrentUser {
  id: string;
  email?: string;
  role: "admin" | "user";
  fullName?: string;
  avatarUrl?: string;
  tokenId?: string;
  tokenName?: string;
  planTier?: "free" | "lite" | "pro";
}

/**
 * Universal session & API Token verification:
 * 1. Bearer / x-api-key Personal Access Token (PAT): Resolves exact user from api_tokens table
 * 2. Cloud mode: Checks Supabase Auth session via cookies
 * 3. Self-hosted mode: Checks local admin JWT cookie
 */
export async function getCurrentUser(request?: Request): Promise<CurrentUser | null> {
  // 1. Check Personal Access Token / API Key from request headers
  try {
    let authHeader: string | null = null;
    let apiKeyHeader: string | null = null;

    if (request) {
      authHeader = request.headers.get("authorization");
      apiKeyHeader = request.headers.get("x-api-key");
    } else {
      const headerList = await headers();
      authHeader = headerList.get("authorization");
      apiKeyHeader = headerList.get("x-api-key");
    }

    let rawToken: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      rawToken = authHeader.slice(7).trim();
    } else if (apiKeyHeader) {
      rawToken = apiKeyHeader.trim();
    }

    if (rawToken && rawToken.startsWith("pp_live_")) {
      const tokenMatch = await verifyAndConsumeToken(rawToken);
      if (tokenMatch) {
        const planTier = await getUserPlanTier(tokenMatch.userId);
        return {
          id: tokenMatch.userId,
          email: tokenMatch.userId === "selfhost-admin" ? "owner@workspace.local" : undefined,
          fullName: tokenMatch.userId === "selfhost-admin" ? "Workspace Owner" : undefined,
          role: tokenMatch.userId === "selfhost-admin" ? "admin" : "user",
          tokenId: tokenMatch.tokenId,
          tokenName: tokenMatch.name,
          planTier,
        };
      }
    }
  } catch {
    // Non-fatal, fallback to cookie checks
  }

  // 2. Check Cloud Mode via Supabase cookies (0ms local memory session check)
  if (isCloudMode()) {
    try {
      const supabase = await createSupabaseServerClient();
      if (supabase) {
        // First try local session from signed cookie (instant memory decode without blocking HTTP roundtrip)
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
        const user = session?.user;
        if (!sessionErr && user) {
          const metadata = user.user_metadata || {};
          const fullName = metadata.full_name || metadata.name || metadata.user_name;
          const avatarUrl = metadata.avatar_url || metadata.picture;
          const planTier = await getUserPlanTier(user.id);

          return {
            id: user.id,
            email: user.email,
            role: "user",
            fullName: typeof fullName === "string" ? fullName : undefined,
            avatarUrl: typeof avatarUrl === "string" ? avatarUrl : undefined,
            planTier,
          };
        }
      }
    } catch {
      // Fallback
    }
  }

  // 3. Fallback / Self-hosted check
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) {
      const isValid = await verifyAdminSessionToken(token);
      if (isValid) {
        const planTier = await getUserPlanTier("selfhost-admin");
        return {
          id: "selfhost-admin",
          email: "owner@workspace.local",
          fullName: "Workspace Owner",
          role: "admin",
          planTier,
        };
      }
    }
  } catch {
    // Outside of request scope or cookies unavailable
  }

  return null;
}

export async function verifyAdminTokenFromCookies(): Promise<boolean> {
  const user = await getCurrentUser();
  return Boolean(user);
}

/**
 * Checks whether a user has administrative or ownership rights over a project.
 * - Global admins (role === "admin") or self-hosted admins can manage any project.
 * - Regular users can only manage projects they created (project.userId === user.id).
 * - Legacy projects without userId are only editable by admins.
 */
export function canManageProject(
  user: CurrentUser | null,
  project: { userId?: string | null }
): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.id === "selfhost-admin") return true;
  if (!project.userId) return false;
  return project.userId === user.id;
}

export function assertCanManageProject(
  user: CurrentUser | null,
  project: { userId?: string | null }
): asserts user is CurrentUser {
  if (!user) {
    throw new Error("Unauthorized: Authentication required");
  }
  if (!canManageProject(user, project)) {
    throw new Error("Forbidden: You do not have permission to modify this project");
  }
}

export async function verifyAdminTokenFromRequest(request: Request): Promise<boolean> {
  try {
    // 1. Bearer Token check
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      const validToken = await verifyApiToken(token);
      if (validToken) return true;
    }

    // 2. Cookie check
    const user = await getCurrentUser();
    return Boolean(user);
  } catch {
    return false;
  }
}

export async function verifyApiToken(token: string): Promise<boolean> {
  if (!token) return false;

  if (process.env.API_TOKEN && timingSafeEqualStrings(token, process.env.API_TOKEN)) {
    return true;
  }

  const customTokens = await getSetting("api_tokens", "");
  if (customTokens) {
    const list = customTokens.split(",").map((t) => t.trim());
    if (list.some((configured) => timingSafeEqualStrings(token, configured))) {
      return true;
    }
  }

  try {
    const adminPwd = await getExpectedAdminPassword();
    if (timingSafeEqualStrings(token, adminPwd)) return true;
  } catch {
    // Expected error in production if admin password unset
  }

  return await verifyAdminSessionToken(token);
}

export { COOKIE_NAME };
