import { Calculator, CheckCircle } from 'lucide-react';

export function InvoiceHeader() {
  return (
    <div className="text-center mb-12">
      {/* Logo and Branding */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="relative">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center transform hover:scale-105 transition-transform duration-200 shadow-lg">
            <Calculator className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full animate-pulse"></div>
        </div>
        <div className="text-left">
          <h1 className="text-5xl font-serif font-bold text-foreground mb-2">
            Invoice Generator
          </h1>
          <p className="text-lg text-muted-foreground">
            by <span className="text-primary font-semibold">TenantFlow</span>
          </p>
        </div>
      </div>
      
      {/* Marketing-focused subtitle */}
      <div className="max-w-3xl mx-auto">
        <p className="text-xl text-muted-foreground mb-4 leading-relaxed">
          Create professional invoices that get paid faster. Beautiful design meets powerful functionality.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Instant PDF Generation</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Auto Tax Calculation</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>Professional Templates</span>
          </div>
        </div>
      </div>
    </div>
  );
}