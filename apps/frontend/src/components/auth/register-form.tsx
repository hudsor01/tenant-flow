"use client";

import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const RegisterSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterData = z.infer<typeof RegisterSchema>

interface RegisterFormProps {
  onSubmit?: (data: RegisterData) => void | Promise<void>
  className?: string
}

export function RegisterForm({ onSubmit, className }: RegisterFormProps) {
  const form = useForm<z.infer<typeof RegisterSchema>>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = async (data: RegisterData) => {
    try {
      if (onSubmit) {
        await onSubmit(data)
      } else {
        // Default demo behavior
        toast.success("Registration successful!", {
          description: "Welcome to TenantFlow! You can now access your dashboard.",
        })
      }
    } catch (error) {
      console.error('Registration failed:', error)
      toast.error("Registration failed", {
        description: "Please check your information and try again.",
      })
    }
  };

  return (
    <div className={className}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 sm:space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address *</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="you@example.com" 
                    autoComplete="email"
                    aria-required
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  We'll use this email to send you important account updates
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
                <FormLabel>Password *</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="Create a strong password" 
                    autoComplete="new-password"
                    aria-required
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Must be at least 8 characters with uppercase, lowercase, number, and special character
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password *</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    aria-required
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Re-enter your password to confirm
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button 
            className="button w-full transition-colors" 
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
