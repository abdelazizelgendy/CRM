import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LocaleRuntime } from "@/components/locale-runtime";
import { localeDirection } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

export const metadata: Metadata = { title: "مدار CRM", description: "إدارة آمنة للشركات والفرق والصلاحيات" };
export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return <html lang={locale} dir={localeDirection(locale)} suppressHydrationWarning><body><LocaleRuntime locale={locale}>{children}</LocaleRuntime></body></html>;
}
