"use client"

import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface FAQItemProps {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}

function FAQItem({ question, answer, isOpen, onToggle }: FAQItemProps) {
  return (
    <div className={cn("border-b border-border", isOpen ? "pb-6" : "pb-3")}>
      <button
        className="group w-full pb-3 inline-flex items-center justify-between gap-x-3 text-left md:text-lg font-semibold text-foreground rounded-lg transition hover:text-muted-foreground focus:outline-none focus:text-muted-foreground pt-6"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        {question}
        {isOpen ? (
          <ChevronUp className="shrink-0 h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        ) : (
          <ChevronDown className="shrink-0 h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <p className="text-muted-foreground">
          {answer}
        </p>
      </div>
    </div>
  )
}

export function FAQSection({ className }: { className?: string }) {
  const [openIndex, setOpenIndex] = useState<number>(0)

  const faqs = [
    {
      question: "Can I cancel my TenantFlow subscription anytime?",
      answer: "Yes, you can cancel your subscription at any time with no hidden fees or penalties. We'll prorate any unused time and appreciate feedback to help us improve."
    },
    {
      question: "How does property and tenant management work?",
      answer: "TenantFlow provides a comprehensive dashboard where you can add properties, manage tenant information, track rent payments, handle maintenance requests, and generate reports. Everything is automated and synchronized in real-time."
    },
    {
      question: "What's included in the pricing plans?",
      answer: "Our plans are tiered based on the number of properties you manage. All plans include core features like tenant management, maintenance tracking, and payment processing. Higher tiers add advanced analytics, custom reporting, and priority support."
    },
    {
      question: "How secure is my property and tenant data?",
      answer: "We use bank-level encryption, secure cloud infrastructure, and comply with all data protection regulations including GDPR and CCPA. Your data is backed up daily and we maintain 99.9% uptime SLA."
    },
    {
      question: "Can I migrate from another property management system?",
      answer: "Yes! We offer free data migration assistance for new customers. Our team will help import your properties, tenants, leases, and historical data to ensure a smooth transition."
    },
    {
      question: "Do you offer API access for integrations?",
      answer: "Enterprise plans include full API access with comprehensive documentation. We also have pre-built integrations with popular accounting software, payment processors, and marketing tools."
    }
  ]

  return (
    <section className={cn("py-16 lg:py-20", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-5 gap-10">
          {/* Left column - Title */}
          <div className="md:col-span-2">
            <div className="max-w-xs">
              <h2 className="text-3xl font-bold md:text-4xl md:leading-tight text-foreground">
                Frequently<br />asked questions
              </h2>
              <p className="mt-3 hidden md:block text-muted-foreground">
                Everything you need to know about TenantFlow and property management.
              </p>
            </div>
          </div>

          {/* Right column - Accordion */}
          <div className="md:col-span-3">
            <div className="divide-y divide-border">
              {faqs.map((faq, index) => (
                <FAQItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openIndex === index}
                  onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default FAQSection