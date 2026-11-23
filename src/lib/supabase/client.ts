import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let cachedPublicClient: SupabaseClient<Database> | null = null;

/**
 * Returns true when public Supabase environment variables are present.
 * Frontend callers can use this or check for `null` query results to fall back
 * cleanly to local mock data.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && anonKey);
}

/**
 * Public (anon-key) Supabase client safe for Server Components and browser use.
 * Returns `null` when Supabase env vars are not configured.
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  if (typeof window === "undefined") {
    return createClient<Database>(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  if (!cachedPublicClient) {
    cachedPublicClient = createClient<Database>(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return cachedPublicClient;
}

/**
 * Service-role Supabase client for trusted server/CLI sync scripts ONLY.
 * Never import or invoke this in client components.
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> | null {
  const url = (
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
