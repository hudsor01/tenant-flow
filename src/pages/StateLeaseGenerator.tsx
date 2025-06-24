import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  CheckCircle, 
  Star,
  Shield,
  AlertTriangle,
  FileText,
  Users,
  Clock,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import LeaseGeneratorForm from '@/components/lease-generator/LeaseGeneratorForm';
import { SEO } from '@/components/seo/SEO';
import { useLeaseGenerator } from '@/hooks/useLeaseGenerator';
import type { LeaseGeneratorForm as LeaseFormData, LeaseOutputFormat } from '@/types/lease-generator';
import { getStateFromSlug, isValidState } from '@/lib/state-data';
import { generateStateSEO } from '@/lib/seo-utils';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

export default function StateLeaseGenerator() {
  const { state: stateSlug } = useParams<{ state: string }>();
  const {
    generateLease,
    isGenerating,
    usageRemaining,
    requiresPayment,
    initiatePayment,
  } = useLeaseGenerator();

  if (!stateSlug || !isValidState(stateSlug.replace(/-/g, ''))) {
    return <Navigate to="/lease-generator" replace />;
  }

  const stateData = getStateFromSlug(stateSlug);

  if (!stateData) {
    return <Navigate to="/lease-generator" replace />;
  }

  const handleGenerateLease = async (formData: LeaseFormData, format: LeaseOutputFormat) => {
    const stateFormData = {
      ...formData,
      state: stateData.name,
      stateCode: stateData.code,
      securityDepositLimit: stateData.legalRequirements.securityDepositLimit,
      requiredDisclosures: stateData.legalRequirements.keyDisclosures
    };
    
    generateLease({ formData: stateFormData, format });
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  // Generate resource links based on state
  const getResourceLinks = () => {
    const stateName = stateData.name.toLowerCase();
    return [
      {
        title: `${stateData.name} Tenant Rights`,
        url: `https://www.google.com/search?q=${encodeURIComponent(stateName + ' tenant rights guide')}`
      },
      {
        title: `${stateData.name} Landlord Laws`,
        url: `https://www.google.com/search?q=${encodeURIComponent(stateName + ' landlord tenant law')}`
      },
      {
        title: `${stateData.name} Housing Authority`,
        url: `https://www.google.com/search?q=${encodeURIComponent(stateName + ' housing authority')}`
      }
    ];
  };


  // Generate optimized SEO data
  const seoData = generateStateSEO(stateSlug!, true);

  return (
    <>
      <SEO
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        type="article"
        canonical={seoData.canonical}
        structuredData={seoData.structuredData}
        breadcrumbs={seoData.breadcrumbs}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
        {/* Header */}
        <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            {/* Breadcrumbs */}
            <Breadcrumbs 
              items={seoData.breadcrumbs!} 
              className="mb-4"
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link to="/lease-generator">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold">{stateData.name} Lease Generator</h1>
                  <p className="text-muted-foreground">{stateData.code}-compliant residential lease agreements</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                <Star className="h-3 w-3 mr-1" />
                {stateData.code}-Compliant
              </Badge>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* State Legal Requirements Alert */}
              <motion.div {...fadeInUp} className="mb-6">
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>{stateData.name} Legal Requirements:</strong> This lease includes all required {stateData.code} disclosures and legal protections. 
                    {stateData.legalRequirements.securityDepositLimit !== 'No statutory limit' && (
                      <> Security deposits are limited to {stateData.legalRequirements.securityDepositLimit}.</>
                    )}
                    <> Entry notice requirement: {stateData.legalRequirements.noticeToEnter}.</>
                  </AlertDescription>
                </Alert>
              </motion.div>

              {/* Lease Generator Form */}
              <motion.div {...fadeInUp} className="transition-all duration-300">
                <LeaseGeneratorForm
                  onGenerate={handleGenerateLease}
                  isGenerating={isGenerating}
                  usageRemaining={usageRemaining}
                  requiresPayment={requiresPayment}
                />
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* State Features */}
              <motion.div {...fadeInUp}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      {stateData.name} Features
                    </CardTitle>
                    <CardDescription>
                      Includes all required {stateData.code} legal protections
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stateData.legalRequirements.keyDisclosures.map((disclosure, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{disclosure}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Entry notice: {stateData.legalRequirements.noticeToEnter}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Users className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Termination notice: {stateData.legalRequirements.noticePeriod}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Usage Stats */}
              <motion.div {...fadeInUp}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Usage Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Free generations remaining</span>
                        <Badge variant="outline">{usageRemaining || 3}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{stateData.code} market size</span>
                        <Badge variant="secondary">{stateData.marketSize}k units</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Monthly searches</span>
                        <Badge variant="secondary">{stateData.searchVolume.toLocaleString()}</Badge>
                      </div>
                    </div>
                    
                    {requiresPayment && (
                      <div className="mt-4 pt-4 border-t">
                        <Button
                          onClick={initiatePayment}
                          className="w-full"
                          size="sm"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Unlock Unlimited ($9.99)
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* State Resources */}
              <motion.div {...fadeInUp}>
                <Card>
                  <CardHeader>
                    <CardTitle>{stateData.name} Resources</CardTitle>
                    <CardDescription>
                      Helpful links for {stateData.code} landlords
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {getResourceLinks().map((link, index) => (
                      <a 
                        key={index}
                        href={link.url}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {link.title}
                      </a>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

