'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { handleCheckoutReturn } from '@/lib/actions/embedded-billing-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react'

interface CheckoutSession {
<<<<<<< HEAD
	id: string
	status: 'complete' | 'open'
	customer_details?: {
		email: string
	}
	subscription?: {
		id: string
	}
}

function CheckoutReturnContent() {
	const searchParams = useSearchParams()
	const router = useRouter()
	const [session, setSession] = useState<CheckoutSession | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const sessionId = searchParams.get('session_id')

		if (!sessionId) {
			setError('No session ID provided')
			setLoading(false)
			return
		}

		const fetchSession = async () => {
			try {
				const result = await handleCheckoutReturn(sessionId)

				if (result.success && result.session) {
					setSession(result.session as CheckoutSession)
				} else {
					setError(result.error || 'Failed to retrieve session')
				}
			} catch (err) {
				setError(
					err instanceof Error ? err.message : 'An error occurred'
				)
			} finally {
				setLoading(false)
			}
		}

		void fetchSession()
	}, [searchParams])

	if (loading) {
		return (
			<Card className="mx-auto w-full max-w-md">
				<CardContent className="flex items-center justify-center p-8">
					<div className="space-y-4 text-center">
						<Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
						<p className="text-muted-foreground">
							Processing your payment...
						</p>
					</div>
				</CardContent>
			</Card>
		)
	}

	if (error) {
		return (
			<Card className="mx-auto w-full max-w-md">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-red-600">
						<XCircle className="h-5 w-5" />
						Payment Error
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
					<Button
						onClick={() => router.push('/billing')}
						className="w-full"
					>
						Try Again
					</Button>
				</CardContent>
			</Card>
		)
	}

	if (session?.status === 'complete') {
		return (
			<Card className="mx-auto w-full max-w-md">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-green-600">
						<CheckCircle className="h-5 w-5" />
						Payment Successful!
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<p className="font-medium">
							Thank you for your subscription!
						</p>
						{session.customer_details?.email && (
							<p className="text-muted-foreground text-sm">
								Confirmation sent to:{' '}
								{session.customer_details.email}
							</p>
						)}
						{session.subscription?.id && (
							<p className="text-muted-foreground text-sm">
								Subscription ID: {session.subscription.id}
							</p>
						)}
					</div>

					<div className="space-y-2">
						<Button
							onClick={() => router.push('/dashboard')}
							className="w-full"
						>
							Go to Dashboard
							<ArrowRight className="ml-2 h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							onClick={() => router.push('/billing')}
							className="w-full"
						>
							Manage Billing
						</Button>
					</div>
				</CardContent>
			</Card>
		)
	}

	if (session?.status === 'open') {
		return (
			<Card className="mx-auto w-full max-w-md">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-amber-600">
						<XCircle className="h-5 w-5" />
						Payment Incomplete
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p>Your payment was not completed. Please try again.</p>
					<Button
						onClick={() => router.push('/billing')}
						className="w-full"
					>
						Return to Billing
					</Button>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className="mx-auto w-full max-w-md">
			<CardContent className="flex items-center justify-center p-8">
				<p className="text-muted-foreground">Unknown session status</p>
			</CardContent>
		</Card>
	)
}

export default function CheckoutReturnPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
			<Suspense
				fallback={
					<Card className="mx-auto w-full max-w-md">
						<CardContent className="flex items-center justify-center p-8">
							<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
						</CardContent>
					</Card>
				}
			>
				<CheckoutReturnContent />
			</Suspense>
		</div>
	)
}
=======
  id: string
  status: 'complete' | 'open'
  customer_details?: {
    email: string
  }
  subscription?: {
    id: string
  }
}

function CheckoutReturnContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [session, setSession] = useState<CheckoutSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    
    if (!sessionId) {
      setError('No session ID provided')
      setLoading(false)
      return
    }

    const fetchSession = async () => {
      try {
        const result = await handleCheckoutReturn(sessionId)
        
        if (result.success && result.session) {
          setSession(result.session as CheckoutSession)
        } else {
          setError(result.error || 'Failed to retrieve session')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [searchParams])

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <div className="space-y-4 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
            <p className="text-muted-foreground">Processing your payment...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Payment Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => router.push('/billing')} className="w-full">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (session?.status === 'complete') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Payment Successful!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="font-medium">Thank you for your subscription!</p>
            {session.customer_details?.email && (
              <p className="text-sm text-muted-foreground">
                Confirmation sent to: {session.customer_details.email}
              </p>
            )}
            {session.subscription?.id && (
              <p className="text-sm text-muted-foreground">
                Subscription ID: {session.subscription.id}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/billing')} 
              className="w-full"
            >
              Manage Billing
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (session?.status === 'open') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600">
            <XCircle className="h-5 w-5" />
            Payment Incomplete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Your payment was not completed. Please try again.</p>
          <Button onClick={() => router.push('/billing')} className="w-full">
            Return to Billing
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Unknown session status</p>
      </CardContent>
    </Card>
  )
}

export default function CheckoutReturnPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </CardContent>
        </Card>
      }>
        <CheckoutReturnContent />
      </Suspense>
    </div>
  )
}
>>>>>>> origin/main
