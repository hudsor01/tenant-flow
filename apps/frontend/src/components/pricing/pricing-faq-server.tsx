import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PricingFAQProps {
  className?: string
}

const faqs = [
  {
    question: 'How does the free trial work?',
    answer: 'Start with a 14-day free trial to explore TenantFlow. No credit card required. After the trial, choose a plan that fits your needs.'
  },
  {
    question: 'Can I switch plans later?',
    answer: 'Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any differences.'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit and debit cards through Stripe. For enterprise plans, we also offer ACH transfers and invoicing.'
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes! We use bank-level encryption, secure cloud infrastructure, and regular backups. Your data is protected with enterprise-grade security measures.'
  },
  {
    question: 'Do you offer discounts for annual billing?',
    answer: 'Yes! Save up to 17% when you choose annual billing. You\'ll get two months free compared to monthly billing.'
  }
]

/**
 * Server component for pricing FAQ section
 * Static content - no interactivity needed
 */
export function PricingFAQServer({ className }: PricingFAQProps) {
  return (
    <div className={`mt-20 max-w-3xl mx-auto ${className || ''}`}>
      <h2 className="text-3xl font-bold text-center mb-8">
        Frequently Asked Questions
      </h2>
      
      <div className="space-y-6">
        {faqs.map((faq, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg">{faq.question}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {faq.answer}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}