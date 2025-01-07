import Link from 'next/link'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { SignupForm } from '@/components/auth/SignupForm'

export default function SignupPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthLayout>
  )
} 