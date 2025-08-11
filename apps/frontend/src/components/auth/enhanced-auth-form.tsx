/**
 * Enhanced Auth Form - Visual Improvements Demo
 * 
 * Showcases modern visual treatments for authentication forms:
 * - Enhanced color palette with better contrast
 * - Improved micro-interactions and animations  
 * - Modern glassmorphism and gradient effects
 * - Better visual hierarchy and spacing
 */

"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, EyeOff, Mail, Lock, Sparkles, Shield, CheckCircle } from 'lucide-react'
import { motion } from '@/lib/framer-motion'
import { cn } from '@/lib/utils'

interface AuthFormData {
  email: string
  password: string
}

interface EnhancedAuthFormProps {
  type: 'login' | 'signup'
  onSubmit?: (data: AuthFormData) => void
}

export function EnhancedAuthForm({ type, onSubmit }: EnhancedAuthFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const isLogin = type === 'login'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsLoading(false)
    onSubmit?.({ email, password })
  }

  const passwordStrength = password.length > 0 ? Math.min(password.length / 8 * 100, 100) : 0

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Enhanced floating badge */}
      <motion.div 
        className="flex justify-center mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Badge className="bg-gradient-to-r from-accent via-primary to-success text-white border-0 px-4 py-2 text-sm font-semibold shadow-lg">
          <Sparkles className="w-4 h-4 mr-2" />
          {isLogin ? 'Welcome Back' : 'Join TenantFlow'}
        </Badge>
      </motion.div>

      {/* Enhanced card with better visual treatment */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-md">
          <CardHeader className="pb-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <CardTitle className="text-center text-2xl font-bold text-display">
                {isLogin ? 'Sign In' : 'Create Account'}
              </CardTitle>
              <p className="text-center text-body-large mt-2 text-muted-foreground">
                {isLogin 
                  ? 'Access your property dashboard' 
                  : 'Start managing properties like a pro'
                }
              </p>
            </motion.div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Enhanced email input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                  Email Address
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className={cn(
                      "pl-11 h-12 text-base border-2 transition-all duration-200",
                      focusedField === 'email' 
                        ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]" 
                        : "border-input hover:border-accent/50"
                    )}
                    required
                  />
                </div>
              </motion.div>

              {/* Enhanced password input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-2"
              >
                <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                  Password
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isLogin ? 'Enter your password' : 'Create a strong password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className={cn(
                      "pl-11 pr-11 h-12 text-base border-2 transition-all duration-200",
                      focusedField === 'password'
                        ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                        : "border-input hover:border-accent/50"
                    )}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {/* Password strength indicator for signup */}
                {!isLogin && password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Password strength</span>
                      <span className={cn(
                        "font-medium",
                        passwordStrength < 50 ? "text-warning" : 
                        passwordStrength < 100 ? "text-accent" : "text-success"
                      )}>
                        {passwordStrength < 50 ? "Weak" : 
                         passwordStrength < 100 ? "Good" : "Strong"}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <motion.div
                        className={cn(
                          "h-full transition-all duration-300 rounded-full",
                          passwordStrength < 50 ? "bg-warning" : 
                          passwordStrength < 100 ? "bg-accent" : "bg-success"
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Enhanced submit button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="pt-2"
              >
                <Button
                  type="submit"
                  variant="premium"
                  size="lg"
                  className="w-full h-12 text-base font-semibold"
                  disabled={isLoading}
                  loading={isLoading}
                  loadingText={isLogin ? "Signing in..." : "Creating account..."}
                >
                  {isLoading ? null : (
                    <>
                      {isLogin ? "Sign In" : "Create Account"}
                      <motion.div
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        →
                      </motion.div>
                    </>
                  )}
                </Button>
              </motion.div>
            </form>

            {/* Enhanced trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="pt-4 border-t border-border/50"
            >
              <div className="flex items-center justify-center space-x-6 text-xs text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-success" />
                  <span>Bank-level security</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>GDPR compliant</span>
                </div>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Enhanced footer links */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="text-center mt-6"
      >
        <p className="text-sm text-muted-foreground">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            className="font-semibold text-primary hover:text-primary-hover underline-offset-4 hover:underline transition-colors"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
      </motion.div>
    </div>
  )
}

export default EnhancedAuthForm