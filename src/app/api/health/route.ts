import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let supabase: "missing" | "configured" | "reachable" | "unreachable" = "missing";
  if (url && anon) {
    supabase = "configured";
    if (service) {
      try {
        const client = createClient(url, service, { auth: { persistSession: false } });
        const { error } = await client.from("profiles").select("id").limit(1);
        supabase = error ? "unreachable" : "reachable";
      } catch {
        supabase = "unreachable";
      }
    }
  }
  return Response.json({
    mode: process.env.NEXT_PUBLIC_DATA_MODE === "supabase" ? "supabase" : "demo",
    supabase,
    coach: process.env.XAI_API_KEY || process.env.GROK_API_KEY ? "configured" : "fallback",
  });
}
