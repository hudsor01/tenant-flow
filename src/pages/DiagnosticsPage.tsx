import React from 'react';
import PaymentDiagnostics from '@/components/billing/PaymentDiagnostics';

export default function DiagnosticsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">System Diagnostics</h1>
          <p className="text-muted-foreground">
            Diagnose and troubleshoot payment system configuration issues.
          </p>
        </div>
        
        <PaymentDiagnostics />
      </div>
    </div>
  );
}