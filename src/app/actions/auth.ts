"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPassword, createAdminSessionToken, COOKIE_NAME } from "@/lib/auth";
import { createSupabaseServerClient, isCloudMode } from "@/lib/supabase/server";
import { sanitizeRedirectPath } from "@/lib/safe-redirect";
import { getSiteUrl } from "@/lib/site-url";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function loginAdmin(prevState: { error?: string } | null, formData: FormData) {
  const password = formString(formData, "password");
  const rawRedirectPath = formString(formData, "from") || "/workspace";
  const redirectPath = sanitizeRedirectPath(rawRedirectPath, "/workspace");

  if (!password) {
    return { error: "请输入密码" };
  }

  const isValid = await verifyPassword(password);
  if (!isValid) {
    return { error: "密码错误，请重试" };
  }

  let token: string;
  try {
    token = await createAdminSessionToken();
  } catch {
    // Fail closed with a clear message instead of a 500 when no signing secret is configured.
    return { error: "服务端未配置会话密钥（SESSION_SECRET，至少 16 位），暂时无法登录" };
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  redirect(redirectPath);
}

export interface EmailAuthState {
  error?: string;
  needsVerification?: boolean;
  email?: string;
}

export async function loginWithEmailAction(
  prevState: EmailAuthState | null | undefined,
  formData: FormData
): Promise<EmailAuthState | undefined> {
  const email = formString(formData, "email").trim();
  const password = formString(formData, "password").trim();
  const confirmPassword = formString(formData, "confirmPassword").trim();
  const isSignUp = formData.get("isSignUp") === "true";
  const lang = formString(formData, "lang") || "zh";
  const rawRedirectPath = formString(formData, "from") || "/workspace";
  const redirectPath = sanitizeRedirectPath(rawRedirectPath, "/workspace");

  if (!email || !password) {
    return { error: lang === "en" ? "Please enter your email and password" : "请输入邮箱与密码" };
  }

  if (isSignUp) {
    if (password.length < 6) {
      return { error: lang === "en" ? "Password must be at least 6 characters" : "密码至少需要 6 位字符" };
    }
    if (password !== confirmPassword) {
      return { error: lang === "en" ? "Passwords do not match" : "两次输入的密码不一致，请重新确认" };
    }
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "当前未配置 Supabase 认证环境变量" };
  }

  if (isSignUp) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      return { error: error.message };
    }

    // In Supabase, if an email is already registered, signUp returns a user with
    // identities: [] (empty array) to prevent email enumeration, and sends NO confirmation email!
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return {
        error:
          lang === "en"
            ? "This email is already associated with an account (e.g. created via GitHub or Google). Please sign in using the buttons above, or use 'Forgot password' to set an email password."
            : "该邮箱已关联现有账号（可能通过 GitHub 或 Google 快捷登录创建）。请直接使用上方第三方登录；或通过【忘记密码】为该账号设置独立的邮箱密码。",
      };
    }

    // If email confirmation is required, session is not immediately returned
    if (!data.session) {
      return {
        needsVerification: true,
        email,
      };
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return { error: error.message };
    }
  }

  redirect(redirectPath);
}

export interface ForgotPasswordState {
  error?: string;
  success?: boolean;
  message?: string;
}

export async function forgotPasswordAction(
  prevState: ForgotPasswordState | null | undefined,
  formData: FormData
): Promise<ForgotPasswordState | undefined> {
  const email = formString(formData, "email").trim();
  const origin = formString(formData, "origin").trim() || getSiteUrl();
  const lang = formString(formData, "lang") || "zh";

  if (!email) {
    return { error: lang === "en" ? "Please enter your email address" : "请输入邮箱地址" };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "当前未配置 Supabase 认证环境变量" };
  }

  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/login?step=reset-password")}`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    message:
      lang === "en"
        ? "Password reset email sent! Please check your inbox and click the link to reset your password."
        : "重置邮件已成功发送！请前往你的邮箱查收并点击重置链接。",
  };
}

export interface ResetPasswordState {
  error?: string;
  success?: boolean;
}

export async function resetPasswordAction(
  prevState: ResetPasswordState | null | undefined,
  formData: FormData
): Promise<ResetPasswordState | undefined> {
  const password = formString(formData, "password").trim();
  const confirmPassword = formString(formData, "confirmPassword").trim();
  const lang = formString(formData, "lang") || "zh";
  const rawRedirectPath = formString(formData, "from") || "/workspace";
  const redirectPath = sanitizeRedirectPath(rawRedirectPath, "/workspace");

  if (!password || !confirmPassword) {
    return { error: lang === "en" ? "Please enter and confirm your new password" : "请输入并确认新密码" };
  }

  if (password.length < 6) {
    return { error: lang === "en" ? "Password must be at least 6 characters" : "密码至少需要 6 位字符" };
  }

  if (password !== confirmPassword) {
    return { error: lang === "en" ? "Passwords do not match" : "两次输入的密码不一致" };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "当前未配置 Supabase 认证环境变量" };
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect(redirectPath);
}

export async function verifyEmailOtpAction(
  prevState: { error?: string } | null | undefined,
  formData: FormData
) {
  const email = formString(formData, "email").trim();
  const token = formString(formData, "token").replace(/[\s-]+/g, "").trim();
  const rawRedirectPath = formString(formData, "from") || "/admin";
  const redirectPath = sanitizeRedirectPath(rawRedirectPath, "/admin");

  if (!email || !token) {
    return { error: "请输入完整验证码" };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "当前未配置 Supabase 认证环境变量" };
  }

  // First try signup type OTP
  const { error: signupErr } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });

  if (signupErr) {
    // Fallback to email / magiclink type OTP
    const { error: emailErr } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (emailErr) {
      return { error: signupErr.message || emailErr.message };
    }
  }

  redirect(redirectPath);
}

export async function resendVerificationOtpAction(email: string) {
  if (!email) {
    return { error: "邮箱不能为空" };
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "当前未配置 Supabase 认证环境变量" };
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) {
    return { error: error.message };
  }
  return { success: true };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();

  if (isCloudMode()) {
    try {
      const supabase = await createSupabaseServerClient();
      if (supabase) {
        await Promise.race([
          supabase.auth.signOut(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Supabase signOut timeout")), 2000)
          ),
        ]);
      }
    } catch (err) {
      console.warn("Supabase server signOut warning or timeout:", err);
    }
  }

  try {
    const allCookies = cookieStore.getAll();
    for (const c of allCookies) {
      if (
        c.name === COOKIE_NAME ||
        c.name.startsWith("sb-") ||
        c.name.includes("supabase") ||
        c.name.includes("auth-token")
      ) {
        cookieStore.delete(c.name);
      }
    }
  } catch (err) {
    console.warn("Failed to delete auth cookies:", err);
  }

  return { success: true };
}

export interface UpdateAccountPasswordState {
  error?: string;
  success?: boolean;
  message?: string;
}

export async function updateAccountPasswordAction(
  prevState: UpdateAccountPasswordState | null | undefined,
  formData: FormData
): Promise<UpdateAccountPasswordState | undefined> {
  const password = formString(formData, "password").trim();
  const confirmPassword = formString(formData, "confirmPassword").trim();
  const lang = formString(formData, "lang") || "zh";

  if (!password || !confirmPassword) {
    return { error: lang === "en" ? "Please enter and confirm your new password" : "请输入并确认新密码" };
  }

  if (password.length < 6) {
    return { error: lang === "en" ? "Password must be at least 6 characters" : "密码至少需要 6 位字符" };
  }

  if (password !== confirmPassword) {
    return { error: lang === "en" ? "Passwords do not match" : "两次输入的密码不一致" };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "当前未配置 Supabase 认证环境变量" };
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    message:
      lang === "en"
        ? "Password updated successfully! You can now sign in with your email and password."
        : "密码设置成功！您现在可以使用该邮箱与密码直接登录了。",
  };
}

