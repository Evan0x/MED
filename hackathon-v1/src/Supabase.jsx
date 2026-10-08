import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Send the signed-in Clerk session token so Supabase row-level security can
// match rows to auth.jwt()->>'sub'. Signed out (e.g. someone scanning a QR),
// this returns null and supabase-js falls back to the public anon key.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => (await window.Clerk?.session?.getToken()) ?? null,
});
