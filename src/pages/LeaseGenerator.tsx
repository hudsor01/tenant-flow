import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  // FileText, // Not currently used 
  Download, 
  CheckCircle, 
  Star,
  Users,
  Clock,
  Shield,
  CreditCard,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import LeaseGeneratorForm from '@/components/lease-generator/LeaseGeneratorForm';
import { useLeaseGenerator } from '@/hooks/useLeaseGenerator';
import type { LeaseGeneratorForm as LeaseFormData, LeaseOutputFormat } from '@/types/lease-generator';

export default function LeaseGenerator() {
  const {
    generateLease,
    isGenerating,
    usageRemaining,
    requiresPayment,
    initiatePayment,
  } = useLeaseGenerator({
    onSuccess: (result) => {
      console.log('Lease generated successfully:', result);
    },
  });

  const handleGenerateLease = async (formData: LeaseFormData, format: LeaseOutputFormat) => {
    generateLease({ formData, format });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Free Lease Generator</h1>
                <p className="text-sm text-muted-foreground">
                  Generate professional lease agreements instantly
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="hidden md:flex">
              <Star className="h-4 w-4 mr-1" />
              Powered by TenantFlow
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-8">
            <LeaseGeneratorForm
              onGenerate={handleGenerateLease}
              isGenerating={isGenerating}
              usageRemaining={usageRemaining}
              requiresPayment={requiresPayment}
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Benefits Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Why Use Our Generator?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-sm">Legally Compliant</div>
                        <div className="text-xs text-muted-foreground">
                          Generated with standard lease terms and conditions
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-sm">Instant Generation</div>
                        <div className="text-xs text-muted-foreground">
                          Get your lease agreement in seconds, not hours
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <Download className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-sm">Multiple Formats</div>
                        <div className="text-xs text-muted-foreground">
                          Download as PDF, Word document, or both
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-sm">Multiple Tenants</div>
                        <div className="text-xs text-muted-foreground">
                          Support for multiple tenants on single lease
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pricing Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Pricing
                  </CardTitle>
                  <CardDescription>
                    Simple, transparent pricing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Free Trial</span>
                      <Badge variant="secondary">Current</Badge>
                    </div>
                    <div className="text-2xl font-bold">$0</div>
                    <div className="text-sm text-muted-foreground">
                      Generate 1 lease agreement free
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">24-Hour Access</span>
                      <Badge variant="outline">Pay-per-use</Badge>
                    </div>
                    <div className="text-2xl font-bold">$9.99</div>
                    <div className="text-sm text-muted-foreground mb-3">
                      Unlimited lease generation for 24 hours
                    </div>
                    
                    {requiresPayment && (
                      <Button 
                        onClick={initiatePayment}
                        className="w-full"
                        size="sm"
                      >
                        Unlock Unlimited Access
                      </Button>
                    )}
                  </div>

                  <Separator />

                  <div className="text-center">
                    <div className="text-sm font-medium mb-2">
                      Need a full property management solution?
                    </div>
                    <Link to="/auth/signup">
                      <Button variant="outline" size="sm">
                        Try TenantFlow Free
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Features Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>What's Included</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Property & tenant information</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Rent amount & payment terms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Security deposit terms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Pet & smoking policies</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Utility responsibilities</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Late fee provisions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Maintenance responsibilities</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Custom additional terms</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Disclaimer */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border-amber-200 dark:border-amber-800">
                <CardContent className="pt-6">
                  <div className="text-xs text-muted-foreground">
                    <strong>Legal Disclaimer:</strong> This lease agreement is a template and should be reviewed by a qualified attorney before use. Laws vary by state and locality. TenantFlow provides this tool for convenience but does not provide legal advice.
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}