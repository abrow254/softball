import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server-side Supabase client bound to the request's auth cookies. Every query
// runs as the logged-in user, so RLS is the real authorization gate. There is
// deliberately NO service-role client here.
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // The middleware (lib/supabase/middleware.ts) refreshes the session.
          }
        },
      },
    },
  )
}
