export type DataProviderKind = "local" | "supabase";

export function getDataProvider(): DataProviderKind {
  const configured = process.env.DATA_PROVIDER?.toLowerCase();
  if (configured === "supabase") return "supabase";
  if (configured && configured !== "local") {
    throw new Error(`Unsupported DATA_PROVIDER: ${configured}`);
  }
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_DATA_IN_PRODUCTION !== "true") {
    throw new Error("Local data provider is disabled in production. Set DATA_PROVIDER=supabase.");
  }
  return "local";
}

export function isLocalProvider() {
  return getDataProvider() === "local";
}
