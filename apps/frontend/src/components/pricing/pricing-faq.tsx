'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FAQItem {
  question: string
  answer: string
}

interface PricingFAQProps {
  className?: string
}

const faqData: FAQItem[] = [
  {
    question: "Can I change plans anytime?",
    answer: "Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll be charged the prorated difference. When downgrading, the credit will be applied to future invoices."
  },
  {
    question: "What happens after my free trial?",
    answer: "After your 14-day free trial, you'll need to choose a paid plan to continue using TenantFlow. Your data will be preserved, and you can pick up right where you left off."
  },
  {
    question: "Do you offer refunds?",
    answer: "We offer a 30-day money-back guarantee for all new subscriptions. If you're not satisfied within the first 30 days, contact support for a full refund."
  },
  {
    question: "Can I import my existing data?",
    answer: "Yes! We provide data import tools and our support team can help you migrate from other property management systems. Enterprise plans include free data migration assistance."
  }
]

/**
 * Client component for FAQ section
 * Needs interactivity for accordion functionality
 */
export function PricingFAQ({ className }: PricingFAQProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const toggleExpanded = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

  return (
    <div className={`mt-20 max-w-3xl mx-auto ${className || ''}`}>
      <h2 className="text-3xl font-bold text-center mb-8">
        Frequently Asked Questions
      </h2>
      <div className="space-y-4">
        {faqData.map((faq, index) => (
          <Card 
            key={index}
            className="transition-all hover:shadow-md cursor-pointer"
            onClick={() => toggleExpanded(index)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{faq.question}</span>
                {expandedIndex === index ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
            
            <div className={cn(
              "overflow-hidden transition-all duration-200 ease-out",
              expandedIndex === index ? "max-h-96" : "max-h-0"
            )}>
              <CardContent className="pt-0">
                <p className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}