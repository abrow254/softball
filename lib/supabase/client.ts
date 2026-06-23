import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client. Used for auth flows (sign in / sign out) in
// client components. The anon key is public by design; RLS protects data.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
