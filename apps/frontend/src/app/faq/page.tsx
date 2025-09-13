'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, ArrowRight, CheckCircle } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { FooterMinimal } from '@/components/sections/footer-minimal'

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        question: 'How quickly can TenantFlow increase my NOI?',
        answer: 'Most property managers see a 40% increase in NOI within 90 days. Our automated rent optimization, reduced vacancy periods (65% faster filling), and 32% maintenance cost reduction deliver immediate results. We guarantee ROI within the first 90 days or your money back.'
      },
      {
        question: 'What makes TenantFlow different from other property management software?',
        answer: 'TenantFlow is the only platform that guarantees a 40% NOI increase. While others focus on basic tasks, we provide enterprise-grade automation that handles 80% of your daily work automatically. Our clients save 20+ hours per week and reduce operational costs by 32% on average.'
      },
      {
        question: 'How much money will I save with TenantFlow?',
        answer: 'The average property manager saves $2,400+ per property per year with TenantFlow. This comes from reduced vacancy time (65% faster), lower maintenance costs (32% reduction), automated rent collection, and eliminated manual tasks. Most clients see full ROI within 2.3 months.'
      }
    ]
  },
  {
    category: 'Features & Benefits',
    questions: [
      {
        question: 'How does TenantFlow automate 80% of daily tasks?',
        answer: 'Our smart workflows handle rent collection, lease renewals, maintenance requests, tenant communications, and financial reporting automatically. AI-powered tenant screening, automated late payment follow-ups, and smart vendor dispatch save you 20+ hours per week.'
      },
      {
        question: 'What specific results can I expect?',
        answer: 'Based on 10,000+ properties managed: 40% average NOI increase, 65% faster vacancy filling, 32% maintenance cost reduction, 80% task automation, and 90% reduction in bad tenants through advanced screening. All results are tracked and guaranteed.'
      },
      {
        question: 'Is TenantFlow suitable for my portfolio size?',
        answer: 'Yes! TenantFlow scales from 1 property to unlimited portfolios. Starter plan handles 1-5 properties, Growth plan manages up to 100 units, and TenantFlow Max supports unlimited properties with white-label options and dedicated account management.'
      }
    ]
  },
  {
    category: 'Implementation & Support',
    questions: [
      {
        question: 'How long does setup take?',
        answer: 'Most property managers are fully operational within 24-48 hours. Our onboarding specialists handle data migration, system configuration, and team training. You can start seeing results immediately with our automated workflows going live on day one.'
      },
      {
        question: 'What kind of support do you provide?',
        answer: 'All plans include priority email support with 4-hour response times. Growth and Max plans get phone support and dedicated account managers. Our team includes property management experts who understand your challenges and provide strategic guidance.'
      },
      {
        question: 'Do you integrate with my existing systems?',
        answer: 'TenantFlow integrates with all major accounting software, payment processors, and maintenance platforms. Our API connects with 500+ business tools. Custom integrations are available for TenantFlow Max customers with dedicated development support.'
      }
    ]
  },
  {
    category: 'Security & Compliance',
    questions: [
      {
        question: 'How secure is my data?',
        answer: 'TenantFlow uses bank-level security with 256-bit SSL encryption, SOC 2 Type II compliance, and regular security audits. Your data is backed up across multiple secure data centers with 99.9% uptime SLA and enterprise-grade protection.'
      },
      {
        question: 'Do you comply with rental regulations?',
        answer: 'Yes, TenantFlow automatically handles compliance for all 50 states including fair housing laws, rent control regulations, eviction procedures, and tenant rights. Our legal team updates the system continuously as regulations change.'
      }
    ]
  },
  {
    category: 'Pricing & ROI',
    questions: [
      {
        question: 'What if TenantFlow doesn\'t deliver the promised results?',
        answer: 'We guarantee 40% NOI increase within 90 days or your money back. If you don\'t see measurable improvements in operational efficiency, cost reduction, and revenue optimization, we\'ll refund your subscription completely.'
      },
      {
        question: 'Are there any hidden fees?',
        answer: 'No hidden fees ever. Our transparent pricing includes all features, unlimited support, regular updates, and data migration. The only additional cost is if you choose premium add-ons like custom integrations or dedicated training sessions.'
      },
      {
        question: 'Can I try TenantFlow risk-free?',
        answer: 'Yes! Start with our 14-day transformation trial - no credit card required. Experience the full platform, see real results, and if you\'re not completely satisfied, there\'s no obligation to continue.'
      }
    ]
  }
]

export default function FAQPage() {
  const [openQuestions, setOpenQuestions] = useState<string[]>([])

  const toggleQuestion = (questionId: string) => {
    setOpenQuestions(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 gradient-authority">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <Badge variant="outline" className="mb-6">
            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
            Trusted by 10,000+ property managers
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gradient-authority">
            Questions about increasing your NOI by 40%?
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Get answers about how TenantFlow's enterprise-grade automation helps property managers 
            reduce costs by 32%, automate 80% of tasks, and guarantee ROI in 90 days.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="px-8">
              Start 14-day transformation
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="px-8">
              See ROI calculator
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="section-hero">
        <div className="container mx-auto px-6 max-w-4xl">
          {faqs.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-16">
              <h2 className="text-3xl font-bold mb-8 text-center">
                {category.category}
              </h2>
              
              <div className="space-y-4">
                {category.questions.map((faq, questionIndex) => {
                  const questionId = `${categoryIndex}-${questionIndex}`
                  const isOpen = openQuestions.includes(questionId)
                  
                  return (
                    <div
                      key={questionIndex}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleQuestion(questionId)}
                        className="w-full px-6 py-6 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors"
                      >
                        <span className="text-lg font-semibold text-gray-900 pr-4">
                          {faq.question}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        )}
                      </button>
                      
                      {isOpen && (
                        <div className="px-6 pb-6">
                          <div className="border-t border-gray-100 pt-4">
                            <p className="text-gray-700 leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-content gradient-authority">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Still have questions?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Speak with a property management automation expert and get a custom ROI projection for your portfolio.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="px-8">
              Schedule Expert Consultation
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="px-8 text-white border-white hover:bg-white hover:text-blue-600">
              Get Custom ROI Report
            </Button>
          </div>
        </div>
      </section>

      <FooterMinimal />
    </div>
  )
}
