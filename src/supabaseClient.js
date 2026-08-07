import { createClient } from "@supabase/supabase-js";

// The demo site (demo.thestem.app) uses a completely separate Supabase project from
// the real one — different database, different logins, zero shared data. This picks
// the right one based on which domain is actually loading the app.
const isDemo = typeof window !== "undefined" && window.location.hostname.startsWith("demo.");

const supabaseUrl = isDemo
  ? import.meta.env.VITE_DEMO_SUPABASE_URL
  : import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = isDemo
  ? import.meta.env.VITE_DEMO_SUPABASE_ANON_KEY
  : import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    isDemo
      ? "Missing VITE_DEMO_SUPABASE_URL or VITE_DEMO_SUPABASE_ANON_KEY. Add these in Vercel's environment variables once the demo Supabase project is set up."
      : "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project details."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
