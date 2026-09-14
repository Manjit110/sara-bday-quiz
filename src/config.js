// Fill these in with your Supabase project's URL and anon/public API key.
// Project Settings -> API in the Supabase dashboard.
export const SUPABASE_URL = "YOUR_SUPABASE_URL";
export const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

// Simple PIN so randoms can't open the admin controls. Change this before the party.
export const ADMIN_PIN = "SARA2026";

export const isSupabaseConfigured =
  SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY" &&
  SUPABASE_URL.startsWith("http");
