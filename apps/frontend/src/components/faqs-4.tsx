'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import Link from 'next/link'

export default function FAQsFour() {
    const faqItems = [
        {
            id: 'item-1',
            question: 'How does TenantFlow help manage my properties?',
            answer: 'TenantFlow provides a unified platform to track all your properties, units, tenants, and leases in one place. Our dashboard gives you real-time insights into occupancy rates, rent collection, and maintenance requests.',
        },
        {
            id: 'item-2',
            question: 'Can I collect rent payments through TenantFlow?',
            answer: 'Yes! TenantFlow integrates with Stripe to enable secure online rent collection. Tenants can pay via credit card, ACH, or bank transfer. You can also set up automatic recurring payments and late fee handling.',
        },
        {
            id: 'item-3',
            question: 'Is my data secure with TenantFlow?',
            answer: 'Absolutely. We use bank-level encryption, secure cloud hosting with Supabase, and follow industry best practices for data protection. Your property and tenant information is always safe and private.',
        },
        {
            id: 'item-4',
            question: 'How much does TenantFlow cost?',
            answer: 'TenantFlow offers flexible pricing starting with a free trial. Our plans scale with your portfolio size, so you only pay for what you need. View our pricing page for detailed plan comparisons.',
        },
        {
            id: 'item-5',
            question: 'Can I migrate my existing property data?',
            answer: 'Yes! We provide data import tools and support to help you migrate from spreadsheets or other property management systems. Our team can assist with the transition to ensure no data is lost.',
        },
    ]

    return (
        <section className="py-16 md:py-24">
            <div className="mx-auto max-w-5xl px-4 md:px-6">
                <div className="mx-auto max-w-xl text-center">
                    <h2 className="text-balance text-3xl font-bold md:text-4xl lg:text-5xl">Frequently Asked Questions</h2>
                    <p className="text-muted-foreground mt-4 text-balance">Discover quick and comprehensive answers to common questions about our platform, services, and features.</p>
                </div>

                <div className="mx-auto mt-12 max-w-xl">
                    <Accordion
                        type="single"
                        collapsible
                        className="bg-muted dark:bg-muted/50 w-full rounded-2xl p-1">
                        {faqItems.map((item) => (
                            <div
                                className="group"
                                key={item.id}>
                                <AccordionItem
                                    value={item.id}
                                    className="data-[state=open]:bg-card dark:data-[state=open]:bg-muted peer rounded-xl border-none px-7 py-1 data-[state=open]:border-none data-[state=open]:shadow-sm">
                                    <AccordionTrigger className="cursor-pointer text-base hover:no-underline">{item.question}</AccordionTrigger>
                                    <AccordionContent>
                                        <p className="text-base">{item.answer}</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <hr className="mx-7 border-dashed group-last:hidden peer-data-[state=open]:opacity-0" />
                            </div>
                        ))}
                    </Accordion>

                    <p className="text-muted-foreground mt-6 px-8">
                        Can't find what you're looking for? Contact our{' '}
                        <Link
                            href="#"
                            className="text-primary font-medium hover:underline">
                            customer support team
                        </Link>
                    </p>
                </div>
            </div>
        </section>
    )
}
