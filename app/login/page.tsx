import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { SignInForm } from '@/components/SignInForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const current = await getCurrentUser()
  if (current) redirect('/')

  return (
    <div className="mx-auto max-w-sm py-10">
      <div className="rounded-xl border border-field-line bg-field-paper p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-field-ink">Sign in</h1>
        <p className="mb-6 text-sm text-field-muted">
          Team access to season stats, game entry, and printable lineup cards.
        </p>
        <SignInForm />
      </div>
    </div>
  )
}
