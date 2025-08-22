/**
 * Server Actions for Authentication
 * React 19 Server Actions for handling form submissions on the server
 */

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export interface AuthFormState {
  success?: boolean
  message?: string
  errors?: {
    email?: string[]
    password?: string[]
    confirmPassword?: string[]
    _form?: string[]
  }
  data?: {
    user?: {
      id: string
      email: string
      name: string
    }
  }
}

/**
 * Login Server Action
 * Handles form submission for user authentication
 */
export async function loginAction(
  prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const redirectTo = formData.get('redirectTo') as string || '/dashboard'
  const _csrfToken = formData.get('csrf_token') as string

  // Validate required fields
  const errors: AuthFormState['errors'] = {}

  if (!email) {
    errors.email = ['Email is required']
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = ['Please enter a valid email address']
  }

  if (!password) {
    errors.password = ['Password is required']
  } else if (password.length < 8) {
    errors.password = ['Password must be at least 8 characters']
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errors
    }
  }

  try {
    // Call backend API for authentication
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        errors: {
          _form: [result.message || 'Authentication failed']
        }
      }
    }

    // Set authentication cookie
    const cookieStore = await cookies()
    cookieStore.set('auth-token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    // Redirect after successful login
    redirect(redirectTo)

  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      errors: {
        _form: ['An unexpected error occurred. Please try again.']
      }
    }
  }
}

/**
 * Logout Server Action
 */
export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('auth-token')
  redirect('/auth/login')
}

/**
 * Register Server Action
 */
export async function registerAction(
  prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  // Validate required fields
  const errors: AuthFormState['errors'] = {}

  if (!name) {
    errors.email = ['Name is required']
  }

  if (!email) {
    errors.email = ['Email is required']
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = ['Please enter a valid email address']
  }

  if (!password) {
    errors.password = ['Password is required']
  } else if (password.length < 8) {
    errors.password = ['Password must be at least 8 characters']
  }

  if (password !== confirmPassword) {
    errors.password = ['Passwords do not match']
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errors
    }
  }

  try {
    // Call backend API for registration
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password })
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        errors: {
          _form: [result.message || 'Registration failed']
        }
      }
    }

    return {
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      data: {
        user: result.user
      }
    }

  } catch (error) {
    console.error('Registration error:', error)
    return {
      success: false,
      errors: {
        _form: ['An unexpected error occurred. Please try again.']
      }
    }
  }
}
/**
 * Update Password Server Action
 */
export async function updatePasswordAction(
  prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const token = (formData.get('token') as string) || (formData.get('resetToken') as string) || ''

  const errors: AuthFormState['errors'] = {}

  if (!password) {
    errors.password = ['Password is required']
  } else if (password.length < 8) {
    errors.password = ['Password must be at least 8 characters']
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = ['Passwords do not match']
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errors
    }
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const response = await fetch(`${apiUrl}/auth/update-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password, token })
    })

    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      return {
        success: false,
        errors: {
          _form: [result.message || 'Failed to update password']
        }
      }
    }

    return {
      success: true,
      message: result.message || 'Your password has been updated'
    }
  } catch (error) {
    console.error('Update password error:', error)
    return {
      success: false,
      errors: {
        _form: ['An unexpected error occurred. Please try again.']
      }
    }
  }
}

// Re-export extended actions
export { getCurrentUser, signupAction, forgotPasswordAction } from './auth-actions-extended'
