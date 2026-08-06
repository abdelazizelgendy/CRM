import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const localAllowed = process.env.NODE_ENV !== "production" || process.env.ALLOW_LOCAL_DATA_IN_PRODUCTION === "true";
  if ((process.env.DATA_PROVIDER ?? "local") === "local" && localAllowed) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
