import { CheckCircle } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface SignupSuccessProps {
  email: string
  onBackToSignIn: () => void
}

export function SignupSuccess({ email, onBackToSignIn }: SignupSuccessProps) {
  return (
    <Card className="border-0 shadow-xl w-full max-w-md">
      <CardHeader className="space-y-1 pb-6">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <CardTitle className="text-2xl font-bold text-center">Check your email</CardTitle>
        <CardDescription className="text-center">
          We've sent a confirmation link to <strong>{email}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Click the link in your email to confirm your account and get started with TenantFlow.
        </p>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={onBackToSignIn}
        >
          Back to Sign In
        </Button>
      </CardContent>
    </Card>
  )
}