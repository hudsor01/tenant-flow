import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react'

const ERROR_MESSAGES: Record<string, { title: string; description: string; action?: string }> = {
  'internal_server_error': {
    title: 'Internal Server Error',
    description: 'Something went wrong on our end. Please try again in a few moments.',
    action: 'retry'
  },
  'unable_to_create_user': {
    title: 'Account Creation Failed',
    description: 'We were unable to create your account. Please try signing up again.',
    action: 'retry'
  },
  'invalid_credentials': {
    title: 'Invalid Credentials', 
    description: 'The email or password you entered is incorrect. Please check and try again.',
    action: 'retry'
  },
  'rate_limit_exceeded': {
    title: 'Too Many Attempts',
    description: 'You have made too many requests. Please wait a moment before trying again.',
    action: 'wait'
  },
  'oauth_error': {
    title: 'OAuth Authentication Failed',
    description: 'There was an issue with the social login. Please try again or use a different method.',
    action: 'retry'
  },
  'session_expired': {
    title: 'Session Expired',
    description: 'Your session has expired for security reasons. Please sign in again.',
    action: 'login'
  },
  'account_banned': {
    title: 'Account Suspended',
    description: 'Your account has been suspended. Please contact support for assistance.',
    action: 'contact'
  },
  'email_verification_required': {
    title: 'Email Verification Required',
    description: 'Please check your email and click the verification link to continue.',
    action: 'email'
  }
}

const DEFAULT_ERROR = {
  title: 'Authentication Error',
  description: 'An unexpected error occurred during authentication. Please try again.',
  action: 'retry'
}

export default function AuthError() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [isRetrying, setIsRetrying] = useState(false)

  const errorCode = searchParams.get('error') || 'unknown'
  const errorDetails = searchParams.get('details') || ''
  const returnUrl = searchParams.get('returnUrl') || '/login'

  const error = ERROR_MESSAGES[errorCode] || DEFAULT_ERROR

  useEffect(() => {
    // Log error for monitoring
    console.error('Auth Error:', { 
      code: errorCode, 
      details: errorDetails,
      timestamp: new Date().toISOString()
    })
  }, [errorCode, errorDetails])

  const handleRetry = async () => {
    setIsRetrying(true)
    
    // Wait a moment for visual feedback
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Navigate back to the return URL or login
    navigate(returnUrl)
    setIsRetrying(false)
  }

  const handleGoHome = () => {
    navigate('/dashboard')
  }

  const handleGoBack = () => {
    navigate(-1)
  }

  const getActionButton = () => {
    switch (error.action) {
      case 'retry':
        return (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-medium rounded-lg transition-colors"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </>
            )}
          </button>
        )
      
      case 'login':
        return (
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Sign In
          </button>
        )
      
      case 'contact':
        return (
          <a
            href="mailto:support@ink37tattoos.com"
            className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-600/90 text-white font-medium rounded-lg transition-colors"
          >
            Contact Support
          </a>
        )
      
      case 'email':
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Didn't receive the email? Check your spam folder or
            </p>
            <button
              onClick={handleRetry}
              className="text-primary hover:text-primary/90 font-medium"
            >
              resend verification email
            </button>
          </div>
        )
      
      case 'wait':
        return (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Please wait a few minutes before trying again.
            </p>
            <button
              onClick={handleGoBack}
              className="inline-flex items-center px-4 py-2 bg-muted hover:bg-muted/90 text-muted-foreground font-medium rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </button>
          </div>
        )
      
      default:
        return (
          <button
            onClick={handleRetry}
            className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-destructive/10 mb-6">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {error.title}
            </h1>
            
            <p className="text-muted-foreground mb-8">
              {error.description}
            </p>

            {errorDetails && (
              <div className="bg-muted/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-muted-foreground">
                  <strong>Error Details:</strong> {errorDetails}
                </p>
              </div>
            )}

            <div className="space-y-4">
              {getActionButton()}
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleGoBack}
                  className="text-muted-foreground hover:text-foreground font-medium"
                >
                  ← Go Back
                </button>
                
                <button
                  onClick={handleGoHome}
                  className="inline-flex items-center text-muted-foreground hover:text-foreground font-medium"
                >
                  <Home className="w-4 h-4 mr-1" />
                  Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
