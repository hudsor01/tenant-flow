'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Property Manager',
    company: 'Johnson Properties LLC',
    content: 'TenantFlow has completely transformed how I manage my 50+ units. The automation features alone save me over 15 hours every week.',
    rating: 5,
    image: '👩‍💼'
  },
  {
    name: 'Michael Chen',
    role: 'Real Estate Investor',
    company: 'Chen Investments',
    content: 'The tenant portal is a game-changer. My tenants love being able to pay rent and submit maintenance requests online.',
    rating: 5,
    image: '👨‍💼'
  },
  {
    name: 'Emily Rodriguez',
    role: 'Landlord',
    company: 'Self-Managed Properties',
    content: 'As a small landlord with 10 units, TenantFlow gives me the tools of a large property management company at an affordable price.',
    rating: 5,
    image: '👩‍💼'
  }
]

export function TestimonialsSection() {
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="py-20 px-4 bg-white">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Loved by Property Managers Everywhere
          </h2>
          <div className="flex justify-center space-x-1 mb-8">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={cn(
                  "transition-all duration-500",
                  activeTestimonial === index ? "opacity-100" : "opacity-0 absolute inset-0"
                )}
              >
                <Card className="p-8 shadow-xl">
                  <div className="flex items-start space-x-4">
                    <div className="text-5xl">{testimonial.image}</div>
                    <div className="flex-1">
                      <p className="text-lg text-gray-600 mb-4 italic">"{testimonial.content}"</p>
                      <div>
                        <p className="font-semibold">{testimonial.name}</p>
                        <p className="text-sm text-gray-500">{testimonial.role}, {testimonial.company}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
          
          <div className="flex justify-center space-x-2 mt-6">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveTestimonial(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  activeTestimonial === index ? "bg-blue-600 w-8" : "bg-gray-300"
                )}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}