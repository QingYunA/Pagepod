"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { translations, type Locale } from "./translations";
import { LOCALE_COOKIE_NAME, LOCALE_COOKIE_MAX_AGE, DEFAULT_LOCALE } from "./constants";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: typeof translations.en;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: translations.en,
});

function getClientInitialLocale(): Locale {
  if (typeof window !== "undefined") {
    // 1. Check window.__INITIAL_LOCALE__ populated synchronously by head script
    const globalInitial = (window as unknown as { __INITIAL_LOCALE__?: Locale }).__INITIAL_LOCALE__;
    if (globalInitial === "zh" || globalInitial === "en") {
      return globalInitial;
    }
    // 2. Check localStorage
    const saved = localStorage.getItem(LOCALE_COOKIE_NAME) as Locale | null;
    if (saved === "zh" || saved === "en") {
      return saved;
    }
    // 3. Fallback to navigator
    const browserLang = (navigator.language || "").toLowerCase();
    return browserLang.startsWith("zh") ? "zh" : "en";
  }
  return DEFAULT_LOCALE;
}

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  // 首帧必须与服务端 SSR 一致（静态 ISR 下服务端恒为默认语言），否则会触发 hydration mismatch；
  // 真实偏好在挂载后同步。
  const [locale, setLocaleState] = useState<Locale>(initialLocale || DEFAULT_LOCALE);

  useEffect(() => {
    if (initialLocale) return;
    const preferred = getClientInitialLocale();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载后一次性同步客户端语言偏好
    setLocaleState((current) => (current === preferred ? current : preferred));
  }, [initialLocale]);

  useEffect(() => {
    // Ensure document lang and cookie are synchronized without triggering a re-render
    try {
      document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
      document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
    } catch {
      // ignore
    }
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LOCALE_COOKIE_NAME, newLocale);
      document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
      document.documentElement.lang = newLocale === "zh" ? "zh-CN" : "en";
    } catch {
      // ignore
    }
  }, []);

  const t = translations[locale];

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
