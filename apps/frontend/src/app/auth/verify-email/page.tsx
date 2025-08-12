import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Mail, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Verify Your Email | TenantFlow',
  description: 'Please verify your email address to complete your TenantFlow account setup.',
}

function VerifyEmailContent({ email }: { email?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-2 pb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 animate-pulse">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-3xl font-bold">Check Your Email</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            We've sent a verification link to your email
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {email && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 text-center font-medium">
                {email}
              </p>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Check your inbox</p>
                <p className="text-sm text-muted-foreground">
                  Click the verification link we sent to confirm your email address
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Complete your setup</p>
                <p className="text-sm text-muted-foreground">
                  After verification, you'll be able to access your dashboard
                </p>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-6">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Didn't receive the email? Check your spam folder or
            </p>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                // TODO: Implement resend verification email
                alert('Resend functionality coming soon!')
              }}
            >
              Resend Verification Email
            </Button>
          </div>
          
          <div className="text-center">
            <Link 
              href="/auth/login"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
            >
              Continue to login
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const params = await searchParams
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-32 w-32 animate-pulse bg-muted rounded-lg" />
      </div>
    }>
      <VerifyEmailContent email={params?.email} />
    </Suspense>
  )
}