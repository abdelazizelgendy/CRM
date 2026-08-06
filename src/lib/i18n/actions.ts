"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isLocale, localeCookie } from "@/lib/i18n/config";

function safeReturnTo(value: FormDataEntryValue | null) {
  const path = String(value ?? "");
  return path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
}

export async function setLocale(formData: FormData) {
  const locale = String(formData.get("locale"));
  if (!isLocale(locale)) redirect(safeReturnTo(formData.get("returnTo")));

  (await cookies()).set(localeCookie, locale, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  redirect(safeReturnTo(formData.get("returnTo")));
}

