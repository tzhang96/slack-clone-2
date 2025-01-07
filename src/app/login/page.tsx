'use client'

import Link from 'next/link'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <AuthLayout
      title="Sign in to ChatGenius"
      subtitle={
        <>
          Don't have an account?{' '}
          <Link href="/signup" className="text-blue-600 hover:text-blue-500">
            Sign up
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  )
} 