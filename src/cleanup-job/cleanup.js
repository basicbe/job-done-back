import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { error } = await supabase.rpc("truncate_app_tables");
if (error) {
  console.error(error);
  process.exit(1);
}
console.log("✅ deleted (truncated) app tables");
