import { Button } from '@/components/ui/button'
import { GoogleIcon } from '@/components/ui/google-icon'

interface GoogleSignupButtonProps {
  onSignup: () => void
  isLoading: boolean
  disabled?: boolean
}

export function GoogleSignupButton({ onSignup, isLoading, disabled }: GoogleSignupButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-11"
      onClick={onSignup}
      disabled={disabled || isLoading}
    >
      <GoogleIcon className="mr-2" size={16} />
      {isLoading ? 'Connecting...' : 'Continue with Google'}
    </Button>
  )
}