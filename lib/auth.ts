import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

export interface CurrentUser {
  user: User
  email: string | null
  role: Role
}

// The authenticated user + their role, or null if signed out.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle()

  return {
    user,
    email: profile?.email ?? user.email ?? null,
    // Default to viewer if the profile row hasn't materialized yet.
    role: (profile?.role as Role) ?? 'viewer',
  }
}

export async function isAdmin(): Promise<boolean> {
  const current = await getCurrentUser()
  return current?.role === 'admin'
}

// Throw if the caller isn't an admin. Use at the top of every write server
// action — defense in depth alongside the RLS policies.
export async function requireAdmin(): Promise<CurrentUser> {
  const current = await getCurrentUser()
  if (!current || current.role !== 'admin') {
    throw new Error('Forbidden: admin access required')
  }
  return current
}
