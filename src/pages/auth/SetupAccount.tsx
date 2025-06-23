import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

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
  // Redirect to login if no email provided
  useEffect(() => {
    if (!email) {
      navigate('/auth/login');
    }
  }, [email, navigate]);

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
      // For post-subscription flow, we want to create account without email confirmation
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            from_subscription: true,
          },
          emailRedirectTo: undefined, // Disable email confirmation for this flow
        }
      });

      // Handle signup errors
      if (signUpError) {
        // If user already exists, that's fine - try to sign them in
        if (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered')) {
          console.log('User already exists, attempting sign in...');
        } else {
          console.error('Signup error:', signUpError);
          setError(`Unable to create account: ${signUpError.message}`);
          return;
        }
      }

      // Always attempt sign in (whether signup succeeded or user already existed)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Sign in error:', signInError);
        setError(`Unable to sign in: ${signInError.message}. Please check your password.`);
        return;
      }

      console.log('Successfully signed in user:', signInData.user?.id);

      // Link the subscription to this user (use signInData.user as it's guaranteed to exist)
      if (signInData.user) {
        try {
          const { error: linkError } = await supabase
            .from('Subscription')
            .update({ userId: signInData.user.id })
            .eq('userEmail', email)
            .is('userId', null);

          if (linkError) {
            console.error('Error linking subscription:', linkError);
            // Don't fail the whole flow - just log it
          } else {
            console.log('Successfully linked subscription to user');
          }
        } catch (linkErr) {
          console.error('Subscription linking failed:', linkErr);
          // Continue anyway - subscription can be linked later
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
    </div>
  );
}