"use client";

import { createContext, useContext, useLayoutEffect } from "react";
import type { Locale } from "@/lib/i18n/config";
import { translateArabic } from "@/lib/i18n/messages";

const LocaleContext = createContext<Locale>("ar");

function translateElement(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (parent && !["SCRIPT", "STYLE", "CODE"].includes(parent.tagName) && !parent.closest("[data-no-translate]")) {
      node.textContent = translateArabic(node.textContent ?? "");
    }
    node = walker.nextNode();
  }
  if (root instanceof Element) {
    const elements = [root, ...root.querySelectorAll("[placeholder],[aria-label],[title]")];
    for (const element of elements) {
      for (const attr of ["placeholder", "aria-label", "title"]) {
        const value = element.getAttribute(attr);
        if (value) element.setAttribute(attr, translateArabic(value));
      }
    }
  }
}

export function LocaleRuntime({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  useLayoutEffect(() => {
    if (locale !== "en") return;
    translateElement(document.body);
    document.title = translateArabic(document.title);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) translateElement(node);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [locale]);

  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function LocalizedName({ ar, en }: { ar?: string | null; en?: string | null }) {
  const locale = useLocale();
  return <>{locale === "en" ? en || ar || "—" : ar || en || "—"}</>;
}

