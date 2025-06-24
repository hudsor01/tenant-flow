import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/seo/SEO';
import StateLeaseLinks from '@/components/lease-generator/StateLeaseLinks';

export default function AllStatesLeaseGenerator() {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  return (
    <>
      <SEO
        title="Free Lease Agreement Templates for All 50 States"
        description="Generate compliant residential lease agreements for any US state. Includes all required legal disclosures, security deposit limits, and state-specific requirements."
        keywords="lease agreement templates, state lease forms, rental agreements, landlord forms, residential lease, property management"
        type="article"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
        {/* Header */}
        <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              <Link to="/lease-generator">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">State Lease Generators</h1>
                <p className="text-muted-foreground">Compliant lease agreements for all 50 US states</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <motion.div {...fadeInUp}>
            <StateLeaseLinks showAll={true} />
          </motion.div>
        </div>
      </div>
    </>
  );
}