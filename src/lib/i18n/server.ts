import "server-only";

import { cookies } from "next/headers";
import { defaultLocale, isLocale, localeCookie } from "@/lib/i18n/config";

export async function getLocale() {
  const value = (await cookies()).get(localeCookie)?.value;
  return isLocale(value) ? value : defaultLocale;
}

