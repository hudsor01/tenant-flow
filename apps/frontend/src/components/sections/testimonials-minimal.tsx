'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Star } from 'lucide-react'

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Property Manager',
    company: 'Metropolitan Properties',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b1fa?w=150&h=150&fit=crop&crop=face',
    content: 'TenantFlow has completely transformed our property management operations. We\'ve increased efficiency by 300%.',
    stars: 5
  },
  {
    name: 'Michael Rodriguez',
    role: 'Real Estate Investor',
    company: 'Rodriguez Holdings',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    content: 'The automated systems have saved us countless hours. Our tenant satisfaction has never been higher.',
    stars: 5
  },
  {
    name: 'Emily Johnson',
    role: 'Portfolio Director',
    company: 'Urban Living Group',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    content: 'Best investment we\'ve made. The ROI tracking and reporting features are game-changing.',
    stars: 5
  }
]

export function TestimonialsMinimal() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold lg:text-4xl mb-4">
            Loved by Property Managers
          </h2>
          <p className="text-lg text-muted-foreground">
            Here's what our customers have to say about TenantFlow
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="text-center">
              <div className="flex items-center justify-center gap-1 mb-6">
                {[...Array(testimonial.stars)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              <blockquote className="text-lg font-medium mb-6 text-gray-900">
                "{testimonial.content}"
              </blockquote>

              <div className="flex items-center justify-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage 
                    src={testimonial.avatar}
                    alt={testimonial.name}
                  />
                  <AvatarFallback>
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <div className="font-semibold text-sm">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                  <div className="text-xs text-blue-600">{testimonial.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Simple Stats */}
        <div className="mt-16 pt-16 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-1">25,000+</div>
              <div className="text-sm text-muted-foreground">Happy Users</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-1">4.9/5</div>
              <div className="text-sm text-muted-foreground">Average Rating</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-1">99.8%</div>
              <div className="text-sm text-muted-foreground">Satisfaction</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}