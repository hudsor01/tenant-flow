import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Loader2, Mail, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function SetupAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // const { } = useAuthStore(); // Currently not needed
  
  const email = searchParams.get('email') || '';
  const name = searchParams.get('name') || '';
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  // Redirect to login if no email provided
  useEffect(() => {
    if (!email) {
      navigate('/auth/login');
    }
  }, [email, navigate]);

  // Helper function to link subscription and redirect
  const linkSubscriptionAndRedirect = async (userId: string) => {
    try {
      const { error: linkError } = await supabase
        .from('Subscription')
        .update({ userId: userId })
        .eq('userEmail', email)
        .is('userId', null);

      if (linkError) {
        logger.error('Error linking subscription during account setup', linkError);
        // Don't fail the whole flow - just log it
      } else {
        logger.info('Successfully linked subscription to user during setup');
      }
    } catch (linkErr) {
      logger.error('Subscription linking failed during account setup', linkErr as Error);
      // Continue anyway - subscription can be linked later
    }

    // Success! Take them to dashboard
    navigate('/dashboard?setup=success');
  };

  const handleResendVerification = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?setup=true`
        }
      });

      if (error) {
        toast.error(`Failed to resend verification: ${error.message}`);
      } else {
        setVerificationSent(true);
        toast.success('Verification email sent! Please check your inbox.');
      }
    } catch {
      toast.error('Failed to resend verification email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Create the account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            from_subscription: true,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?setup=true`,
        }
      });

      if (signUpError) {
        // If user already exists, try to sign them in
        if (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered')) {
          logger.info('User already exists, attempting sign in during setup');
          
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            // If sign in fails due to email not confirmed, show verification modal
            if (signInError.message.includes('Email not confirmed')) {
              setShowVerificationModal(true);
              setError(null);
              return;
            } else {
              setError(`Unable to sign in: ${signInError.message}`);
              return;
            }
          }

          // Sign in successful - link subscription and redirect
          await linkSubscriptionAndRedirect(signInData.user.id);
          return;
        } else {
          setError(`Unable to create account: ${signUpError.message}`);
          return;
        }
      }

      // Step 2: Account created successfully
      if (signUpData.user) {
        // Check if email confirmation is required
        if (!signUpData.session) {
          // Email confirmation required - show modal
          setShowVerificationModal(true);
          setError(null);
          return;
        } else {
          // No email confirmation required - proceed directly
          await linkSubscriptionAndRedirect(signUpData.user.id);
          return;
        }
      }

      // Success! Take them to dashboard
      navigate('/dashboard?setup=success');
    } catch {
      setError('Unable to complete setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle>Complete Your Account Setup</CardTitle>
            <CardDescription>
              Your subscription was successful! Setup is taking a bit longer than expected, but you can set your password now to complete your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !password || !confirmPassword}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up account...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                By setting up your account, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Email Verification Modal */}
      <Dialog open={showVerificationModal} onOpenChange={setShowVerificationModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Verify Your Email
            </DialogTitle>
            <DialogDescription>
              We've sent a verification email to <strong>{email}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Check Your Email</h3>
              <p className="text-muted-foreground mb-4">
                Please click the verification link in the email we sent to complete your account setup and access your dashboard.
              </p>
              {verificationSent && (
                <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm mb-4">
                  <CheckCircle className="h-4 w-4" />
                  Verification email sent successfully!
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Button
                onClick={handleResendVerification}
                disabled={isLoading || verificationSent}
                variant="outline"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : verificationSent ? (
                  'Email Sent!'
                ) : (
                  'Resend Verification Email'
                )}
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Can't find the email? Check your spam folder or{' '}
                  <button
                    onClick={handleResendVerification}
                    disabled={isLoading}
                    className="text-primary hover:underline"
                  >
                    try a different email
                  </button>
                </p>
              </div>

              <div className="text-center">
                <Button
                  onClick={() => {
                    setShowVerificationModal(false);
                    navigate('/auth/login');
                  }}
                  variant="ghost"
                  className="text-sm"
                >
                  Return to Login
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}