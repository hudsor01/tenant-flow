import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'
import { useBilling } from '@/hooks/useBilling'

export const Route = createFileRoute('/billing/success')({
  component: BillingSuccessPage,
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: search.session_id as string | undefined,
  }),
})

function BillingSuccessPage() {
  const searchParams = Route.useSearch()
  const sessionId = searchParams?.session_id
  const { handleCheckoutSuccess } = useBilling()
  // Note: useAuth doesn't have refetch method, removed auth variable
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const completeCheckout = async () => {
      if (!sessionId) {
        setStatus('error')
        setError('No checkout session ID provided')
        return
      }

      try {
        await handleCheckoutSuccess(sessionId)
        // Note: Auth will be updated automatically through subscription hooks
        setStatus('success')
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Failed to complete checkout')
      }
    }

    completeCheckout()
  }, [sessionId, handleCheckoutSuccess])

  if (status === 'loading') {
    return (
      <div className="container max-w-2xl mx-auto py-16">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">Processing your subscription...</h2>
            <p className="text-muted-foreground">Please wait while we activate your account.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="container max-w-2xl mx-auto py-16">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Something went wrong</CardTitle>
            <CardDescription className="text-lg mt-2">
              {error || 'We encountered an error processing your subscription.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Don't worry, if you were charged, your subscription will be activated shortly. 
              If the issue persists, please contact support.
            </p>
            <div className="flex gap-4">
              <Button asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard" search={{}}>Billing Settings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl mx-auto py-16">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Welcome to TenantFlow Pro!</CardTitle>
          <CardDescription className="text-lg mt-2">
            Your subscription has been activated successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted rounded-lg p-6">
            <h3 className="font-semibold mb-3">What's next?</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>All premium features are now unlocked for your account</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>You can manage your subscription anytime from the billing settings</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>You'll receive a receipt via email shortly</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link to="/dashboard" search={{}}>Billing Settings</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}