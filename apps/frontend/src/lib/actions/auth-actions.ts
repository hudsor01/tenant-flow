'use server';

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth, supabase } from '@/lib/supabase';
import type { AuthUser } from '@/lib/supabase';

// Auth form schemas
const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const SignupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  companyName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const ResetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const UpdatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export interface AuthFormState {
  errors?: {
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
    fullName?: string[];
    companyName?: string[];
    _form?: string[];
  };
  success?: boolean;
  message?: string;
  data?: {
    user?: {
      id: string;
      email: string;
      name?: string;
    };
    session?: {
      access_token: string;
      refresh_token: string;
    };
  };
}

export async function loginAction(
  prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const result = LoginSchema.safeParse(rawData);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const { error } = await auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });

    if (error) {
      return {
        errors: {
          _form: [error.message],
        },
      };
    }

    // Revalidate auth-related caches
    revalidateTag('user');
    revalidateTag('session');
    
    // Redirect to dashboard
    redirect('/dashboard');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return {
      errors: {
        _form: [message],
      },
    };
  }
}

export async function signupAction(
  prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    fullName: formData.get('fullName'),
    companyName: formData.get('companyName'),
  };

  const result = SignupSchema.safeParse(rawData);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const { error } = await auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        data: {
          full_name: result.data.fullName,
          company_name: result.data.companyName,
        },
      },
    });

    if (error) {
      return {
        errors: {
          _form: [error.message],
        },
      };
    }

    return {
      success: true,
      message: 'Account created! Please check your email to verify your account.',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Signup failed';
    return {
      errors: {
        _form: [message],
      },
    };
  }
}

export async function logoutAction(): Promise<AuthFormState> {
  try {
    await auth.signOut();
    
    // Clear all cached data
    revalidateTag('user');
    revalidateTag('session');
    revalidateTag('properties');
    revalidateTag('tenants');
    revalidateTag('leases');
    revalidateTag('maintenance');
    
    // Redirect to home page
    redirect('/');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Logout error:', message);
    return {
      errors: {
        _form: [message],
      },
    };
  }
}

export async function forgotPasswordAction(
  prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const rawData = {
    email: formData.get('email'),
  };

  const result = ResetPasswordSchema.safeParse(rawData);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const { error } = await auth.resetPasswordForEmail(result.data.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/update-password`,
    });

    if (error) {
      return {
        errors: {
          _form: [error.message],
        },
      };
    }

    return {
      success: true,
      message: 'Password reset email sent! Check your inbox for instructions.',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send reset email';
    return {
      errors: {
        _form: [message],
      },
    };
  }
}

export async function updatePasswordAction(
  prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const rawData = {
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  };

  const result = UpdatePasswordSchema.safeParse(rawData);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const { error } = await auth.updateUser({
      password: result.data.password,
    });

    if (error) {
      return {
        errors: {
          _form: [error.message],
        },
      };
    }

    // Revalidate user data
    revalidateTag('user');
    
    return {
      success: true,
      message: 'Password updated successfully!',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update password';
    return {
      errors: {
        _form: [message],
      },
    };
  }
}

// Server-side auth helpers
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    return {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name || user.email!,
      avatar_url: user.user_metadata?.avatar_url,
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }
  
  return user;
}

// OAuth actions
export async function signInWithGoogle(): Promise<void> {
  const { data, error } = await auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signInWithGitHub(): Promise<void> {
  const { data, error } = await auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.url) {
    redirect(data.url);
  }
}