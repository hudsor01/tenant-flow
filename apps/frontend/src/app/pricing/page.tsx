import Navbar from '@/components/navbar';
import { SaasPricingSection } from '@/components/sections/saas-pricing-section';

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20">
        <SaasPricingSection />
        
        {/* FAQ Section */}
        <section className="py-24 bg-muted/20">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-muted-foreground">Everything you need to know about our pricing</p>
            </div>
            
            <div className="space-y-6">
              {[
                {
                  question: "What's included in the free trial?",
                  answer: "All plans include a 14-day free trial with full access to features. No credit card required."
                },
                {
                  question: "Can I change plans later?",
                  answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately."
                },
                {
                  question: "What payment methods do you accept?",
                  answer: "We accept all major credit cards, PayPal, and ACH transfers for annual plans."
                },
                {
                  question: "Is there a setup fee?",
                  answer: "No setup fees. What you see is what you pay. We believe in transparent pricing."
                },
                {
                  question: "Do you offer refunds?",
                  answer: "Yes, we offer a 30-day money-back guarantee for all paid plans."
                }
              ].map((faq, index) => (
                <div key={index} className="border rounded-lg p-6">
                  <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-16">
              <p className="text-muted-foreground mb-4">Still have questions?</p>
              <button className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                Contact Support
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}