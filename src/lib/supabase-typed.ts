import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../types/database";

export type TypedSupabaseClient = SupabaseClient<Database>;

export function createTypedSupabaseClient(
  url: string,
  anonymousKey: string,
): TypedSupabaseClient {
  return createClient<Database>(url, anonymousKey);
}
