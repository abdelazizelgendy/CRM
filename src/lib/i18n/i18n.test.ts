import { describe, expect, it } from "vitest";
import { isLocale, localeDirection, localizedName } from "./config";
import { translateArabic } from "./messages";

describe("internationalization", () => {
  it("accepts only supported locales and returns the correct direction", () => {
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(localeDirection("ar")).toBe("rtl");
    expect(localeDirection("en")).toBe("ltr");
  });

  it("uses the requested localized database label with a safe fallback", () => {
    const value = { name_ar: "جديد", name_en: "New" };
    expect(localizedName("ar", value)).toBe("جديد");
    expect(localizedName("en", value)).toBe("New");
    expect(localizedName("en", { name_ar: "مخصص" })).toBe("مخصص");
  });

  it("translates static interface strings while preserving surrounding space", () => {
    expect(translateArabic("  تسجيل الدخول ")).toBe("  Sign in ");
    expect(translateArabic("3 مستخدم")).toBe("3 users");
  });
});
