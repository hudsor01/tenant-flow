/**
 * Extended Auth Actions - Additional exports for compatibility
 */

import { cookies } from 'next/headers'
import type { AuthFormState } from './auth-actions'
<<<<<<< HEAD
// registerAction removed - no longer exists in auth-actions
=======
import { registerAction } from './auth-actions'
>>>>>>> origin/main

/**
 * Update Password Server Action
 */
export async function updatePasswordAction(
<<<<<<< HEAD
	prevState: AuthFormState,
	formData: FormData
): Promise<AuthFormState> {
	const password = formData.get('password') as string
	const confirmPassword = formData.get('confirmPassword') as string
	const token =
		(formData.get('token') as string) ||
		(formData.get('resetToken') as string) ||
		''

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
		const apiUrl = process.env.NEXT_PUBLIC_API_URL
		if (!apiUrl) {
			throw new Error('API URL not configured')
		}
		const response = await fetch(`${apiUrl}/auth/update-password`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ password, token })
		})

		if (!response.ok) {
			return {
				success: false,
				errors: {
					_form: ['Failed to update password']
				}
			}
		}

		return {
			success: true,
			message: 'Password updated successfully'
		}
	} catch {
		return {
			success: false,
			errors: {
				_form: ['An error occurred. Please try again.']
			}
		}
	}
=======
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
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password, token })
    })

    if (!response.ok) {
      return {
        success: false,
        errors: {
          _form: ['Failed to update password']
        }
      }
    }

    return {
      success: true,
      message: 'Password updated successfully'
    }
  } catch {
    return {
      success: false,
      errors: {
        _form: ['An error occurred. Please try again.']
      }
    }
  }
>>>>>>> origin/main
}

/**
 * Get current user from session
 */
export async function getCurrentUser() {
<<<<<<< HEAD
	const cookieStore = await cookies()
	const authToken = cookieStore.get('auth-token')

	if (!authToken) {
		return null
	}

	try {
		const apiUrl = process.env.NEXT_PUBLIC_API_URL
		if (!apiUrl) {
			throw new Error('API URL not configured')
		}
		const response = await fetch(`${apiUrl}/auth/me`, {
			headers: {
				Authorization: `Bearer ${authToken.value}`
			}
		})

		if (!response.ok) {
			return null
		}

		return await response.json()
	} catch {
		return null
	}
=======
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth-token')
  
  if (!authToken) {
    return null
  }
  
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const response = await fetch(`${apiUrl}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authToken.value}`
      }
    })
    
    if (!response.ok) {
      return null
    }
    
    return await response.json()
  } catch {
    return null
  }
>>>>>>> origin/main
}

/**
 * Signup Server Action
 */
export async function signupAction(
<<<<<<< HEAD
	_prevState: AuthFormState,
	_formData: FormData
): Promise<AuthFormState> {
	// Stub implementation - registerAction removed
	return {
		success: false,
		error: 'Registration not implemented in extended actions'
	}
}

// Alias for compatibility
export const registerAction = signupAction

=======
  prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  // Use the existing registerAction
  return registerAction(prevState, formData)
}

>>>>>>> origin/main
/**
 * Forgot Password Server Action
 */
export async function forgotPasswordAction(
<<<<<<< HEAD
	prevState: AuthFormState,
	formData: FormData
): Promise<AuthFormState> {
	const email = formData.get('email') as string

	if (!email) {
		return {
			success: false,
			errors: {
				email: ['Email is required']
			}
		}
	}

	try {
		const apiUrl = process.env.NEXT_PUBLIC_API_URL
		if (!apiUrl) {
			throw new Error('API URL not configured')
		}
		const response = await fetch(`${apiUrl}/auth/forgot-password`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ email })
		})

		if (!response.ok) {
			return {
				success: false,
				errors: {
					_form: ['Failed to send reset email']
				}
			}
		}

		return {
			success: true,
			message: 'Password reset instructions have been sent to your email'
		}
	} catch {
		return {
			success: false,
			errors: {
				_form: ['An error occurred. Please try again.']
			}
		}
	}
}
=======
  prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = formData.get('email') as string
  
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
      return {
        success: false,
        errors: {
          _form: ['Failed to send reset email']
        }
      }
    }
    
    return {
      success: true,
      message: 'Password reset instructions have been sent to your email'
    }
  } catch {
    return {
      success: false,
      errors: {
        _form: ['An error occurred. Please try again.']
      }
    }
  }
}
>>>>>>> origin/main
