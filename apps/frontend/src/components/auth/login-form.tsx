"use client"

import { z } from 'zod'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Separator } from "@/components/ui/separator"
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { GoogleButton } from './google-button'

// Login form validation schema
const LoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
})

type LoginData = z.infer<typeof LoginSchema>

interface LoginFormProps {
  className?: string
  onSubmit?: (data: LoginData) => void | Promise<void>
  onForgotPassword?: () => void
  onSignUp?: () => void
  onGoogleLogin?: () => void | Promise<void>
  isLoading?: boolean
  isGoogleLoading?: boolean
}

export function LoginForm({
  className,
  onSubmit,
  onForgotPassword,
  onSignUp,
  onGoogleLogin,
  isLoading = false,
  isGoogleLoading = false,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const handleSubmit = async (data: LoginData) => {
    try {
      await onSubmit?.(data)
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  return (
    <div className={cn("space-y-4 sm:space-y-6", className)}>
      <div className="text-center space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Login to your account</h1>
        <p className="text-muted-foreground text-sm text-balance leading-relaxed">
          Enter your email below to login to your account
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="m@example.com" 
                    autoComplete="email"
                    {...field}
                    aria-required
                  />
                </FormControl>
                <FormDescription className="sr-only">
                  Enter your registered email address
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center">
                  <FormLabel>Password *</FormLabel>
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="ml-auto text-sm underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded"
                  >
                    Forgot your password?
                  </button>
                </div>
                <FormControl>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      autoComplete="current-password"
                      className="pr-10"
                      {...field}
                      aria-required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormDescription className="sr-only">
                  Enter your account password
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button 
            type="submit" 
            className="w-full transition-all duration-200 shadow-sm hover:shadow-md"
            disabled={form.formState.isSubmitting || isLoading}
          >
            {(form.formState.isSubmitting || isLoading) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {(form.formState.isSubmitting || isLoading) ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </Form>
      
      {onGoogleLogin && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          
          <GoogleButton
            onClick={onGoogleLogin}
            isLoading={isGoogleLoading}
            disabled={form.formState.isSubmitting || isLoading || isGoogleLoading}
          />
        </>
      )}
      
      <div className="text-center text-sm">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={onSignUp}
          className="underline underline-offset-4 hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded"
        >
          Sign up
        </button>
      </div>
    </div>
  )
}
