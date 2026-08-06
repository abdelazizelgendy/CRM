"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Languages } from "lucide-react";
import { setLocale } from "@/lib/i18n/actions";
import { useLocale } from "@/components/locale-runtime";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams();
  const query = search.toString();
  const returnTo = `${pathname}${query ? `?${query}` : ""}`;
  const nextLocale = locale === "ar" ? "en" : "ar";

  return (
    <form action={setLocale} className="language-switcher">
      <input type="hidden" name="locale" value={nextLocale} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button type="submit" aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}>
        <Languages size={17} />
        <span>{locale === "ar" ? "English" : "العربية"}</span>
      </button>
    </form>
  );
}
