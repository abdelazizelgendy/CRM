import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "مدار CRM", description: "إدارة آمنة للشركات والفرق والصلاحيات" };
export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
