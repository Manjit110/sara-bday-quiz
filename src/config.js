// Fill these in with your Supabase project's URL and anon/public API key.
// Project Settings -> API in the Supabase dashboard.
export const SUPABASE_URL = "https://bxdezsdcfzwgdepeomgp.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_Uexuo7-BVeaz5cRIySIVsA_CKJgG6u9";

// Simple PIN so randoms can't open the admin controls. Change this before the party.
export const ADMIN_PIN = "SARA2026";

export const isSupabaseConfigured =
  SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY" &&
  SUPABASE_URL.startsWith("http");
