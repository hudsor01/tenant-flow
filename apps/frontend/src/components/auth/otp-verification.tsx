"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { BlurFade } from "@/components/magicui/blur-fade"
import { NumberTicker } from "@/components/magicui/number-ticker"
import { Loader2, Mail, ArrowLeft, Shield } from 'lucide-react'
import { 
  cn, 
  buttonClasses,
  inputClasses,
  cardClasses,
  ANIMATION_DURATIONS,
  TYPOGRAPHY_SCALE
} from "@/lib/utils"

interface OTPVerificationProps {
  onSubmit?: (otp: string) => void | Promise<void>
  onResend?: () => void | Promise<void>
  onBack?: () => void
  email?: string
  isLoading?: boolean
  className?: string
}

export function OTPVerification({ 
  onSubmit, 
  onResend, 
  onBack, 
  email = "john@example.com", 
  isLoading = false, 
  className 
}: OTPVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0 && !canResend) {
      setCanResend(true)
    }
    return undefined
  }, [countdown, canResend])

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return
    
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all filled
    if (newOtp.every(digit => digit) && value) {
      handleSubmit(newOtp.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleSubmit = async (otpValue: string) => {
    await onSubmit?.(otpValue)
  }

  const handleResend = async () => {
    setCountdown(60)
    setCanResend(false)
    await onResend?.()
  }

  return (
    <div className={cn("min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-purple-50", className)}>
      <div className="w-full max-w-md">
        <BlurFade delay={0.2} inView>
          <div className="bg-white rounded-3xl p-8 shadow-2xl border border-gray-100">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-white" />
                </div>
              </div>
              
              <BlurFade delay={0.3} inView>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
                <p className="text-gray-600 mb-4">
                  We've sent a verification code to
                </p>
                <p className="text-blue-600 font-semibold">{email}</p>
              </BlurFade>
            </div>

            {/* OTP Input */}
            <BlurFade delay={0.4} inView>
              <div className="mb-8">
                <div className="flex gap-3 justify-center mb-6">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className={cn(
                        "w-12 h-12 text-center font-bold rounded-10px border-2",
                        `transition-all duration-[${ANIMATION_DURATIONS.default}]`,
                        "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800",
                        "focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-gray-900",
                        "focus:ring-3 focus:ring-blue-500/20 dark:focus:ring-blue-400/20",
                        "hover:border-gray-300 dark:hover:border-gray-600",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        digit && "border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20"
                      )}
                      style={{
                        fontSize: TYPOGRAPHY_SCALE['heading-lg'].fontSize,
                        lineHeight: TYPOGRAPHY_SCALE['heading-lg'].lineHeight,
                        fontWeight: TYPOGRAPHY_SCALE['heading-lg'].fontWeight
                      }}
                      disabled={isLoading}
                    />
                  ))}
                </div>
                
                <div className="text-center">
                  {!canResend ? (
                    <p className="text-gray-500 text-sm">
                      Resend code in <span className="font-semibold text-blue-600">
                        <NumberTicker value={countdown} />
                      </span>s
                    </p>
                  ) : (
                    <button
                      onClick={handleResend}
                      className="text-blue-600 hover:text-blue-500 text-sm font-semibold transition-colors"
                      disabled={isLoading}
                    >
                      Didn't receive the code? Resend
                    </button>
                  )}
                </div>
              </div>
            </BlurFade>

            {/* Submit Button */}
            <BlurFade delay={0.5} inView>
              <Button
                onClick={() => handleSubmit(otp.join(''))}
                disabled={otp.some(digit => !digit) || isLoading}
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </Button>
            </BlurFade>

            {/* Footer */}
            <BlurFade delay={0.6} inView>
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                  <Mail className="w-4 h-4" />
                  <span>Check your spam folder if you don't see the email</span>
                </div>
                
                {onBack && (
                  <div className="text-center mt-4">
                    <button
                      onClick={onBack}
                      className="inline-flex items-center text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Back to login
                    </button>
                  </div>
                )}
              </div>
            </BlurFade>
          </div>
        </BlurFade>
      </div>
    </div>
  )
}