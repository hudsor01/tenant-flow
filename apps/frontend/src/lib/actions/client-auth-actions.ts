/**
 * Client-Safe Auth Actions
 * Wrappers that can be safely imported in client components
 */

import type { AuthFormState } from './auth-actions'

/**
 * Client-safe update password action
 * Uses direct API calls instead of server actions
 */
export async function updatePasswordClient(
  password: string,
  confirmPassword: string,
  token: string
): Promise<AuthFormState> {
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
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password, token })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        errors: {
          _form: [errorData.message || 'Failed to update password']
        }
      }
    }

    return {
      success: true,
      message: 'Password updated successfully'
    }
  } catch (error) {
    console.error('Update password error:', error)
    return {
      success: false,
      errors: {
        _form: ['An error occurred. Please try again.']
      }
    }
  }
}

/**
 * Client-safe logout action
 * Uses direct API calls instead of server actions
 */
export async function logoutClient(): Promise<{ success: boolean; message?: string }> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const response = await fetch(`${apiUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include' // Include cookies for auth
    })

    if (!response.ok) {
      return {
        success: false,
        message: 'Failed to logout'
      }
    }

    // Clear any local storage or session data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-token')
      sessionStorage.clear()
    }

    return {
      success: true,
      message: 'Logged out successfully'
    }
  } catch (error) {
    console.error('Logout error:', error)
    return {
      success: false,
      message: 'An error occurred during logout'
    }
  }
}

/**
 * Client-safe signup action
 * Uses direct API calls instead of server actions
 */
export async function signupClient(
  name: string,
  email: string,
  password: string,
  confirmPassword?: string,
  _redirectTo?: string
): Promise<AuthFormState> {
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

  if (confirmPassword && password !== confirmPassword) {
    errors.password = ['Passwords do not match']
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errors
    }
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const response = await fetch(`${apiUrl}/auth/register`, {
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
 * Client-safe login action
 * Uses direct API calls instead of server actions
 */
export async function loginClient(
  email: string,
  password: string,
  _redirectTo?: string
): Promise<AuthFormState> {
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
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
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

    // Store token if provided
    if (result.access_token && typeof window !== 'undefined') {
      localStorage.setItem('auth-token', result.access_token)
    }

    return {
      success: true,
      message: 'Login successful',
      data: {
        user: result.user
      }
    }
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
 * Client-safe forgot password action
 * Uses direct API calls instead of server actions
 */
export async function forgotPasswordClient(email: string): Promise<AuthFormState> {
  if (!email) {
    return {
      success: false,
      errors: {
        email: ['Email is required']
      }
    }
  }

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const response = await fetch(`${apiUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        errors: {
          _form: [errorData.message || 'Failed to send reset email']
        }
      }
    }

    return {
      success: true,
      message: 'Password reset instructions have been sent to your email'
    }
  } catch (error) {
    console.error('Forgot password error:', error)
    return {
      success: false,
      errors: {
        _form: ['An error occurred. Please try again.']
      }
    }
  }
}