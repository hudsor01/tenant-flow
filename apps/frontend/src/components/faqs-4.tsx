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
        <section className="tw-:py-16 tw-:md:py-24">
            <div className="tw-:mx-auto tw-:max-w-5xl tw-:px-4 tw-:md:px-6">
                <div className="tw-:mx-auto tw-:max-w-xl tw-:text-center">
                    <h2 className="tw-:text-balance tw-:text-3xl tw-:font-bold tw-:md:text-4xl tw-:lg:text-5xl">Frequently Asked Questions</h2>
                    <p className="tw-:text-muted-foreground tw-:mt-4 tw-:text-balance">Discover quick and comprehensive answers to common questions about our platform, services, and features.</p>
                </div>

                <div className="tw-:mx-auto tw-:mt-12 tw-:max-w-xl">
                    <Accordion
                        type="single"
                        collapsible
                        className="tw-:bg-muted tw-:dark:bg-muted/50 tw-:w-full tw-:rounded-2xl tw-:p-1">
                        {faqItems.map((item) => (
                            <div
                                className="tw-:group"
                                key={item.id}>
                                <AccordionItem
                                    value={item.id}
                                    className="tw-:data-[state=open]:bg-card tw-:dark:data-[state=open]:bg-muted tw-:peer tw-:rounded-xl tw-:border-none tw-:px-7 tw-:py-1 tw-:data-[state=open]:border-none tw-:data-[state=open]:shadow-sm">
                                    <AccordionTrigger className="tw-:cursor-pointer tw-:text-base tw-:hover:no-underline">{item.question}</AccordionTrigger>
                                    <AccordionContent>
                                        <p className="tw-:text-base">{item.answer}</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <hr className="tw-:mx-7 tw-:border-dashed tw-:group-last:hidden tw-:peer-data-[state=open]:opacity-0" />
                            </div>
                        ))}
                    </Accordion>

                    <p className="tw-:text-muted-foreground tw-:mt-6 tw-:px-8">
                        Can't find what you're looking for? Contact our{' '}
                        <Link
                            href="#"
                            className="tw-:text-primary tw-:font-medium tw-:hover:underline">
                            customer support team
                        </Link>
                    </p>
                </div>
            </div>
        </section>
    )
}
