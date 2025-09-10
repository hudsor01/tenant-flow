'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Star, ChevronLeft, ChevronRight } from 'lucide-react'

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Property Manager',
    company: 'Metropolitan Properties',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b1fa?w=150&h=150&fit=crop&crop=face',
    content: 'TenantFlow has transformed how we manage our 200+ unit portfolio. The automated rent collection alone saves us 20 hours per week.',
    stars: 5,
    portfolioSize: '200+ Units'
  },
  {
    name: 'Michael Rodriguez',
    role: 'Real Estate Investor',
    company: 'Rodriguez Holdings',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    content: 'The maintenance request system is incredible. Tenants report issues instantly, and we can track everything from start to finish.',
    stars: 5,
    portfolioSize: '150+ Units'
  },
  {
    name: 'Emily Johnson',
    role: 'Portfolio Director',
    company: 'Urban Living Group',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    content: 'Best investment we\'ve made for our business. The tenant screening process is thorough yet fast, helping us find quality tenants quickly.',
    stars: 5,
    portfolioSize: '500+ Units'
  },
  {
    name: 'David Park',
    role: 'Property Owner',
    company: 'Park Residential',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    content: 'The financial reporting features give me complete visibility into my property performance. ROI tracking has never been easier.',
    stars: 5,
    portfolioSize: '75+ Units'
  },
  {
    name: 'Lisa Thompson',
    role: 'Asset Manager',
    company: 'Thompson Real Estate',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face',
    content: 'TenantFlow\'s automation has allowed us to scale from 50 to 300 units without increasing our team size. It\'s revolutionary.',
    stars: 5,
    portfolioSize: '300+ Units'
  }
]

export function TestimonialsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  useEffect(() => {
    if (!isAutoPlaying) return
    
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlaying])

  const nextTestimonial = () => {
    setCurrentIndex(currentIndex === testimonials.length - 1 ? 0 : currentIndex + 1)
    setIsAutoPlaying(false)
  }

  const prevTestimonial = () => {
    setCurrentIndex(currentIndex === 0 ? testimonials.length - 1 : currentIndex - 1)
    setIsAutoPlaying(false)
  }

  const currentTestimonial = testimonials[currentIndex]

  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold lg:text-5xl mb-6">
            What Our Customers
            <br />
            <span className="text-blue-600">Are Saying</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Join thousands of property managers who trust TenantFlow
          </p>
        </div>

        <div className="relative">
          <Card className="border-2 border-blue-100 shadow-2xl">
            <CardContent className="p-12">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-8">
                  {[...Array(currentTestimonial?.stars || 5)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <blockquote className="text-2xl font-medium mb-8 leading-relaxed max-w-3xl mx-auto">
                  "{currentTestimonial?.content || 'Loading testimonial...'}"
                </blockquote>

                <div className="flex items-center justify-center gap-4 mb-6">
                  <Avatar className="w-16 h-16">
                    <AvatarImage 
                      src={currentTestimonial?.avatar || ''}
                      alt={currentTestimonial?.name || ''}
                    />
                    <AvatarFallback>
                      {currentTestimonial?.name?.split(' ').map(n => n[0]).join('') || 'TF'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <div className="font-semibold text-lg">{currentTestimonial?.name || 'Loading...'}</div>
                    <div className="text-muted-foreground">{currentTestimonial?.role || ''}</div>
                    <div className="text-blue-600 font-medium">{currentTestimonial?.company || ''}</div>
                    <div className="text-sm text-muted-foreground">{currentTestimonial?.portfolioSize || ''}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={prevTestimonial}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            {/* Dots Indicator */}
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index)
                    setIsAutoPlaying(false)
                  }}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={nextTestimonial}
              className="flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600 mb-1">1,225+</div>
            <div className="text-sm text-muted-foreground">Total Properties</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600 mb-1">4.9/5</div>
            <div className="text-sm text-muted-foreground">Average Rating</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600 mb-1">98%</div>
            <div className="text-sm text-muted-foreground">Would Recommend</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600 mb-1">24/7</div>
            <div className="text-sm text-muted-foreground">Customer Support</div>
          </div>
        </div>
      </div>
    </section>
  )
}