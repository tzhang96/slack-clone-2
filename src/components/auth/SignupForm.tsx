'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/shared/Button'
import { Input } from '@/components/shared/Input'

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  fullName: z.string()
    .min(1, 'Full name is required')
    .max(50, 'Full name must be at most 50 characters'),
})

type SignupFormData = z.infer<typeof signupSchema>

export function SignupForm() {
  const { signUp } = useAuth()
  const [error, setError] = useState('')
  const router = useRouter()
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const handleSignup = async (data: SignupFormData) => {
    try {
      setError('')
      await signUp(data.email, data.password, data.username, data.fullName)
      router.push('/chat')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An error occurred during signup')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(handleSignup)} className="mt-8 space-y-6">
      <div className="space-y-4">
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          {...register('email')}
          error={errors.email?.message}
        />
        <Input
          label="Username"
          autoComplete="username"
          {...register('username')}
          error={errors.username?.message}
        />
        <Input
          label="Full name"
          autoComplete="name"
          {...register('fullName')}
          error={errors.fullName?.message}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
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
        aria-label={isSubmitting ? 'Creating account...' : 'Sign up'}
      >
        Sign up
      </Button>
    </form>
  )
} 