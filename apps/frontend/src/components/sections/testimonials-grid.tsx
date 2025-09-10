'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Star } from 'lucide-react'

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Property Manager',
    company: 'Metropolitan Properties',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b1fa?w=150&h=150&fit=crop&crop=face',
    content: 'TenantFlow has transformed how we manage our 200+ unit portfolio. The automated rent collection alone saves us 20 hours per week.',
    stars: 5
  },
  {
    name: 'Michael Rodriguez',
    role: 'Real Estate Investor',
    company: 'Rodriguez Holdings',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    content: 'The maintenance request system is incredible. Tenants report issues instantly, and we can track everything from start to finish.',
    stars: 5
  },
  {
    name: 'Emily Johnson',
    role: 'Portfolio Director',
    company: 'Urban Living Group',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    content: 'Best investment we\'ve made for our business. The tenant screening process is thorough yet fast, helping us find quality tenants quickly.',
    stars: 5
  },
  {
    name: 'David Park',
    role: 'Property Owner',
    company: 'Park Residential',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    content: 'The financial reporting features give me complete visibility into my property performance. ROI tracking has never been easier.',
    stars: 5
  }
]

export function TestimonialsGrid() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold lg:text-5xl mb-6">
            Trusted by Property Managers
            <br />
            <span className="text-blue-600">Across the Country</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            See why thousands of property managers trust TenantFlow to streamline 
            their operations and grow their business.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Featured Testimonial */}
          <Card className="md:col-span-2 border-2 border-blue-100 shadow-lg">
            <CardContent className="p-8">
              <div className="flex items-center gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              <blockquote className="text-2xl font-medium mb-8 leading-relaxed">
                "TenantFlow has completely revolutionized our property management operations. 
                We've increased our efficiency by 300% and our tenant satisfaction scores have 
                never been higher. It's not just software – it's a complete business transformation."
              </blockquote>

              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage 
                    src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face"
                    alt="James Wilson" 
                  />
                  <AvatarFallback>JW</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-lg">James Wilson</div>
                  <div className="text-muted-foreground">CEO, Wilson Property Management</div>
                  <div className="text-sm text-blue-600">Managing 500+ Units</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Regular Testimonials */}
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.stars)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <blockquote className="text-lg font-medium mb-6 leading-relaxed">
                  "{testimonial.content}"
                </blockquote>

                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage 
                      src={testimonial.avatar}
                      alt={testimonial.name}
                    />
                    <AvatarFallback>
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    <div className="text-sm text-blue-600">{testimonial.company}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-blue-600 mb-2">10,000+</div>
            <div className="text-sm text-muted-foreground">Properties Managed</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-600 mb-2">99.8%</div>
            <div className="text-sm text-muted-foreground">Customer Satisfaction</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-600 mb-2">50%</div>
            <div className="text-sm text-muted-foreground">Time Saved</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-600 mb-2">4.9/5</div>
            <div className="text-sm text-muted-foreground">Average Rating</div>
          </div>
        </div>
      </div>
    </section>
  )
}