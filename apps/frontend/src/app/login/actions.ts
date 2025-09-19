'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import type { LoginCredentials } from '@repo/shared'

export async function loginAction(credentials: LoginCredentials) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => {
          return cookieStore.getAll()
        },
        setAll: (cookieArray) => {
          cookieArray.forEach(({ name, value, options }) => {
            cookieStore.set({ name, value, ...options })
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  })

  if (error) {
    return {
      success: false,
      error: error.message,
      needsEmailConfirmation: error.message.includes('Email not confirmed')
    }
  }

  if (data.user) {
    // Redirect to dashboard after successful login
    redirect('/dashboard')
  }

  return {
    success: false,
    error: 'Login failed'
  }
}