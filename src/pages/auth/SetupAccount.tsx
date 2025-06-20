import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
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
  const { signIn } = useAuthStore();
  
  const email = searchParams.get('email') || '';
  const name = searchParams.get('name') || '';
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitingForAccount, setWaitingForAccount] = useState(true);

  // Check if account has been created by webhook
  useEffect(() => {
    if (!email) {
      navigate('/auth/login');
      return;
    }

    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max
    
    const checkAccount = setInterval(async () => {
      attempts++;
      
      try {
        // Check if user exists by trying to send a password reset
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/auth/update-password',
        });
        
        if (!error || error.message.includes('User not found')) {
          if (!error) {
            // Account exists!
            clearInterval(checkAccount);
            setWaitingForAccount(false);
          }
        }
      } catch (e) {
        console.error('Check account error:', e);
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(checkAccount);
        setError('Account setup is taking too long. Please contact support.');
        setWaitingForAccount(false);
      }
    }, 1000);

    return () => clearInterval(checkAccount);
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
      // First, create the account with password
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            from_subscription: true,
          }
        }
      });

      if (signUpError) {
        // If user already exists, just sign them in
        if (signUpError.message.includes('already registered')) {
          const { error: signInError } = await supabase.auth.updateUser({
            password
          });
          
          if (signInError) throw signInError;
          
          // Sign in with new password
          await signIn(email, password);
          navigate('/dashboard?setup=success');
        } else {
          throw signUpError;
        }
      } else {
        // New account created, sign them in
        await signIn(email, password);
        navigate('/dashboard?setup=success');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up account');
    } finally {
      setIsLoading(false);
    }
  };

  if (waitingForAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle>Setting Up Your Account</CardTitle>
            <CardDescription>
              Your subscription was successful! We're creating your account...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

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
              Set a secure password to access your TenantFlow account
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