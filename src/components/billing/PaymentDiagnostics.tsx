import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { STRIPE_CONFIG, validateStripeConfig } from '@/lib/stripe-config';
import { validateApiConfig } from '@/services/api';

interface DiagnosticCheck {
  name: string;
  status: 'checking' | 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

export default function PaymentDiagnostics() {
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);
  const [isRunning, setIsRunning] = useState(true);

  const runDiagnostics = useCallback(async () => {
    const diagnosticChecks: DiagnosticCheck[] = [];
    
    // Check 1: Stripe Configuration
    const stripeValidation = validateStripeConfig();
    diagnosticChecks.push({
      name: 'Stripe Configuration',
      status: stripeValidation.isValid ? 'pass' : 'fail',
      message: stripeValidation.isValid 
        ? 'All Stripe environment variables are configured' 
        : 'Missing Stripe configuration',
      details: stripeValidation.missing.length > 0 
        ? `Missing: ${stripeValidation.missing.join(', ')}` 
        : undefined
    });

    // Check 2: API Configuration
    const apiValidation = validateApiConfig();
    diagnosticChecks.push({
      name: 'API Configuration',
      status: apiValidation.isValid ? 'pass' : 'fail',
      message: apiValidation.isValid 
        ? 'All API environment variables are configured' 
        : 'Missing API configuration',
      details: apiValidation.errors.length > 0 
        ? `Missing: ${apiValidation.errors.join(', ')}` 
        : undefined
    });

    // Check 3: Stripe Publishable Key Format
    const pubKeyCheck = checkStripePublishableKey();
    diagnosticChecks.push({
      name: 'Stripe Publishable Key Format',
      status: pubKeyCheck.valid ? 'pass' : 'fail',
      message: pubKeyCheck.message,
      details: pubKeyCheck.details
    });

    // Check 4: Test API Endpoint
    const apiCheck = await testApiEndpoint();
    diagnosticChecks.push({
      name: 'API Endpoint Connection',
      status: apiCheck.success ? 'pass' : 'fail',
      message: apiCheck.message,
      details: apiCheck.details
    });

    // Check 5: Browser Console Errors
    diagnosticChecks.push({
      name: 'Browser Console',
      status: 'warning',
      message: 'Check browser console for additional errors',
      details: 'Press F12 to open developer tools and check the Console tab'
    });

    setChecks(diagnosticChecks);
    setIsRunning(false);
  }, []);

  useEffect(() => {
    runDiagnostics();
  }, [runDiagnostics]);

  const checkStripePublishableKey = () => {
    const key = STRIPE_CONFIG.publishableKey;
    
    if (!key) {
      return {
        valid: false,
        message: 'Publishable key is not set',
        details: 'VITE_STRIPE_PUBLISHABLE_KEY environment variable is missing'
      };
    }

    if (key.startsWith('pk_test_')) {
      return {
        valid: true,
        message: 'Test mode publishable key detected',
        details: `Key: ${key.substring(0, 20)}...`
      };
    }

    if (key.startsWith('pk_live_')) {
      return {
        valid: true,
        message: 'Live mode publishable key detected',
        details: `Key: ${key.substring(0, 20)}...`
      };
    }

    return {
      valid: false,
      message: 'Invalid publishable key format',
      details: 'Key should start with pk_test_ or pk_live_'
    };
  };

  const testApiEndpoint = async () => {
    try {
      const response = await fetch('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return {
          success: true,
          message: 'API endpoint is reachable',
          details: `Status: ${response.status}`
        };
      }

      return {
        success: false,
        message: 'API endpoint returned an error',
        details: `Status: ${response.status} - ${response.statusText}`
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to reach API endpoint',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const getStatusIcon = (status: DiagnosticCheck['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: DiagnosticCheck['status']) => {
    switch (status) {
      case 'checking':
        return <Badge variant="secondary">Checking</Badge>;
      case 'pass':
        return <Badge className="bg-green-100 text-green-800">Pass</Badge>;
      case 'fail':
        return <Badge variant="destructive">Fail</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
    }
  };

  const hasFailures = checks.some(check => check.status === 'fail');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment System Diagnostics</CardTitle>
        <CardDescription>
          Checking configuration and connectivity for payment processing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRunning && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Running diagnostics...
          </div>
        )}

        {!isRunning && hasFailures && (
          <Alert variant="destructive">
            <AlertDescription>
              Some checks failed. Please review the details below and fix any configuration issues.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {checks.map((check, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
              <div className="mt-0.5">{getStatusIcon(check.status)}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{check.name}</p>
                  {getStatusBadge(check.status)}
                </div>
                <p className="text-sm text-muted-foreground">{check.message}</p>
                {check.details && (
                  <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                    {check.details}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {!isRunning && !hasFailures && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All diagnostic checks passed. If you're still experiencing issues, check the browser console for additional errors.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Common Issues:</p>
          <ul className="space-y-1 ml-4">
            <li>• Missing or incorrect environment variables</li>
            <li>• Stripe publishable key mismatch (test vs live)</li>
            <li>• API endpoint not accessible</li>
            <li>• Network or CORS issues</li>
            <li>• Browser extensions blocking requests</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}