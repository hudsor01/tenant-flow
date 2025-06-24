import React from 'react';
import PaymentDiagnostics from '@/components/billing/PaymentDiagnostics';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function DiagnosticsPage() {
  const { user, error, resetSessionCheck, checkSession } = useAuthStore();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">System Diagnostics</h1>
          <p className="text-muted-foreground">
            Diagnose and troubleshoot system configuration and authentication issues.
          </p>
        </div>
        
        {/* Authentication Diagnostics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Authentication Status
            </CardTitle>
            <CardDescription>
              Check and reset authentication session state
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">User Status:</span>
                <span className={`ml-2 ${user ? 'text-green-600' : 'text-red-600'}`}>
                  {user ? 'Authenticated' : 'Not authenticated'}
                </span>
              </div>
              <div>
                <span className="font-medium">User ID:</span>
                <span className="ml-2 text-muted-foreground">
                  {user?.id || 'None'}
                </span>
              </div>
              <div>
                <span className="font-medium">Email:</span>
                <span className="ml-2 text-muted-foreground">
                  {user?.email || 'None'}
                </span>
              </div>
              <div>
                <span className="font-medium">Error Status:</span>
                <span className={`ml-2 ${error ? 'text-red-600' : 'text-green-600'}`}>
                  {error || 'No errors'}
                </span>
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={() => checkSession()}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Check Session
              </Button>
              
              <Button 
                onClick={resetSessionCheck}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Reset Auth Circuit Breaker
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Payment Diagnostics */}
        <PaymentDiagnostics />
      </div>
    </div>
  );
}