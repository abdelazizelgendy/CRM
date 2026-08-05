export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return <div role="status" className={`form-message ${error ? "error" : "success"}`}>{error ?? success}</div>;
}
