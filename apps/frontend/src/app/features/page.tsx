import Navbar from '@/components/navbar';
import { Settings, BarChart3 } from 'lucide-react';
import { SaasFeaturesSection } from '@/components/sections/saas-features-section';

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20">
        {/* Hero Section */}
        <section className="py-24">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl font-bold mb-6">
              Everything you need to manage properties
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-12">
              From tenant screening to maintenance tracking, TenantFlow provides all the tools 
              you need to streamline your property management operations.
            </p>
          </div>
        </section>
        
        <SaasFeaturesSection />
        
        {/* Detailed Features */}
        <section className="py-24 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Built for modern property managers</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Our platform is designed with the latest technology to help you work smarter, not harder.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
              <div>
                <h3 className="text-2xl font-bold mb-4">Automated Workflows</h3>
                <p className="text-muted-foreground mb-6">
                  Set up automated processes for rent collection, lease renewals, and maintenance requests. 
                  Save hours every week with intelligent automation that works for you.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>Automated rent reminders</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>Lease renewal notifications</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span>Maintenance scheduling</span>
                  </li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg p-8 h-64 flex items-center justify-center">
                <div className="text-center">
                  <Settings className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <p className="font-semibold">Automation Dashboard</p>
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto mt-24">
              <div className="bg-gradient-to-br from-accent/10 to-primary/10 rounded-lg p-8 h-64 flex items-center justify-center order-2 md:order-1">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-accent" />
                  <p className="font-semibold">Analytics Dashboard</p>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <h3 className="text-2xl font-bold mb-4">Smart Analytics</h3>
                <p className="text-muted-foreground mb-6">
                  Get deep insights into your property performance with comprehensive analytics. 
                  Track occupancy rates, revenue trends, and maintenance costs in real-time.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full" />
                    <span>Revenue tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full" />
                    <span>Occupancy analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full" />
                    <span>Predictive insights</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to see these features in action?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Start your free trial today and experience the power of modern property management.
            </p>
            <button className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors">
              Start Free Trial
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}