'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'
import { useSupabase } from '@/components/providers/SupabaseProvider'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const { signIn } = useAuth()
  const { supabase } = useSupabase()
  const [error, setError] = useState('')
  const router = useRouter()
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const handleLogin = async (data: LoginFormData) => {
    try {
      setError('')
      await signIn(data.email, data.password)
      
      // Wait for auth state to be updated
      const maxAttempts = 10
      const interval = 200 // 200ms between checks
      let attempts = 0

      const checkAuthAndRedirect = async () => {
        if (attempts >= maxAttempts) {
          setError('Login successful but failed to redirect. Please try refreshing the page.')
          return
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          router.push('/chat')
        } else {
          attempts++
          setTimeout(checkAuthAndRedirect, interval)
        }
      }

      await checkAuthAndRedirect()
    } catch (err) {
      setError('Invalid email or password')
    }
  }

  return (
    <form onSubmit={handleSubmit(handleLogin)} className="mt-8 space-y-6">
      <div className="space-y-4">
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          {...register('email')}
          error={errors.email?.message}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          error={errors.password?.message}
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 text-center" role="alert">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        isLoading={isSubmitting}
        aria-label={isSubmitting ? 'Signing in...' : 'Sign in'}
      >
        Sign in
      </Button>
    </form>
  )
} 