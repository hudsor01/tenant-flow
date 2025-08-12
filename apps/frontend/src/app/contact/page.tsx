'use client'

import React, { useState, useOptimistic } from 'react'
import { logger } from '@/lib/logger'
import { motion, AnimatePresence } from '@/lib/framer-motion'
import { logger } from '@/lib/logger'
import { Badge } from '@/components/ui/badge'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { logger } from '@/lib/logger'
import { Input } from '@/components/ui/input'
import { logger } from '@/lib/logger'
import { Label } from '@/components/ui/label'
import { logger } from '@/lib/logger'
import { Textarea } from '@/components/ui/textarea'
import { logger } from '@/lib/logger'
import { 
  Mail, 
  Phone, 
  Clock, 
  MessageCircle, 
  Send, 
  CheckCircle, 
  HeadphonesIcon,
  Sparkles,
  Users,
  Zap,
  Shield
} from 'lucide-react'

interface ContactForm {
  name: string
  email: string
  subject: string
  message: string
  type: 'sales' | 'support' | 'general'
}

interface ContactMethod {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  title: string
  description: string
  contact: string
  availability: string
  gradient: string
}

export default function ContactPage() {
  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    subject: '',
    message: '',
    type: 'general'
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [optimisticSubmitted, setOptimisticSubmitted] = useOptimistic(
    false,
    (state, optimisticValue: boolean) => optimisticValue
  )

  const contactMethods: ContactMethod[] = [
    {
      icon: Mail,
      title: 'Email Support',
      description: 'Get help with any questions or issues',
      contact: 'support@tenantflow.app',
      availability: 'Response within 4 hours',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      icon: Phone,
      title: 'Phone Support',
      description: 'Speak directly with our team',
      contact: '+1 (555) 123-4567',
      availability: 'Mon-Fri, 9AM-6PM EST',
      gradient: 'from-green-500 to-green-600'
    },
    {
      icon: MessageCircle,
      title: 'Live Chat',
      description: 'Instant help when you need it',
      contact: 'Available in app',
      availability: 'Mon-Sun, 8AM-8PM EST',
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      icon: HeadphonesIcon,
      title: 'Sales Inquiry',
      description: 'Learn more about our solutions',
      contact: 'sales@tenantflow.app',
      availability: 'Response within 2 hours',
      gradient: 'from-orange-500 to-orange-600'
    }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setOptimisticSubmitted(true)

    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Reset form on success
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        type: 'general'
      })
    } catch (error) {
      logger.error('Form submission error:', error instanceof Error ? error : new Error(String(error)), { component: 'app_contact_page.tsx' })
      setOptimisticSubmitted(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (
    field: keyof ContactForm,
    value: string
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-6"
            >
              <Badge className="bg-gradient-to-r from-primary via-accent to-success text-white border-0 px-6 py-2 text-sm font-semibold shadow-lg">
                <Sparkles className="w-4 h-4 mr-2" />
                Contact Us
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight"
            >
              Let's{' '}
              <span className="bg-gradient-to-r from-primary via-accent to-success bg-clip-text text-transparent">
                Connect
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
            >
              Have questions? Need support? Want to learn more? We're here to help you succeed 
              with your property management goals.
            </motion.p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Contact Methods */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-foreground mb-4">Get in Touch</h2>
                <p className="text-muted-foreground">
                  Choose the contact method that works best for you. Our team is standing by to help.
                </p>
              </div>

              {contactMethods.map((method, index) => {
                const IconComponent = method.icon
                return (
                  <motion.div
                    key={method.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="border-0 bg-gradient-to-br from-white to-muted/30 hover:shadow-lg transition-all duration-300 group cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className={`w-12 h-12 bg-gradient-to-br ${method.gradient} rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                            <IconComponent className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground mb-1">{method.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{method.description}</p>
                            <p className="text-sm font-medium text-primary mb-1">{method.contact}</p>
                            <p className="text-xs text-muted-foreground">{method.availability}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}

              {/* Office Hours */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <Card className="border-0 bg-gradient-to-br from-accent/5 to-primary/5">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <Clock className="w-6 h-6 text-accent" />
                      <h3 className="font-semibold text-foreground">Office Hours</h3>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Monday - Friday</span>
                        <span>9:00 AM - 6:00 PM EST</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Saturday</span>
                        <span>10:00 AM - 4:00 PM EST</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sunday</span>
                        <span>Closed</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-md">
                <CardHeader className="pb-6">
                  <CardTitle className="text-2xl font-bold text-foreground">
                    Send us a Message
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Fill out the form below and we'll get back to you as soon as possible.
                  </p>
                </CardHeader>

                <CardContent>
                  <AnimatePresence mode="wait">
                    {optimisticSubmitted ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="text-center py-12"
                      >
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-success to-accent rounded-full flex items-center justify-center mb-6">
                          <CheckCircle className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-2xl font-semibold text-foreground mb-4">Message Sent!</h3>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                          Thank you for reaching out. We'll get back to you within 4 hours during business hours.
                        </p>
                        <Button 
                          onClick={() => setOptimisticSubmitted(false)}
                          variant="outline"
                        >
                          Send Another Message
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.form
                        key="form"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onSubmit={handleSubmit}
                        className="space-y-6"
                      >
                        {/* Contact Type Selection */}
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold text-foreground">
                            What can we help you with?
                          </Label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                              { value: 'sales', label: 'Sales Inquiry', icon: Users },
                              { value: 'support', label: 'Technical Support', icon: Zap },
                              { value: 'general', label: 'General Question', icon: Shield }
                            ].map((option) => {
                              const IconComponent = option.icon
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => handleInputChange('type', option.value as ContactForm['type'])}
                                  className={`p-4 border-2 rounded-lg text-center transition-all duration-200 ${
                                    formData.type === option.value
                                      ? 'border-primary bg-primary/5 text-primary'
                                      : 'border-input hover:border-accent/50 text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  <IconComponent className="w-5 h-5 mx-auto mb-2" />
                                  <div className="text-sm font-medium">{option.label}</div>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Name and Email */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-semibold text-foreground">
                              Full Name *
                            </Label>
                            <Input
                              id="name"
                              placeholder="Your full name"
                              value={formData.name}
                              onChange={(e) => handleInputChange('name', e.target.value)}
                              className="h-12 border-2 transition-all duration-200 focus:border-primary focus:shadow-lg focus:shadow-primary/10"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                              Email Address *
                            </Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="your@email.com"
                              value={formData.email}
                              onChange={(e) => handleInputChange('email', e.target.value)}
                              className="h-12 border-2 transition-all duration-200 focus:border-primary focus:shadow-lg focus:shadow-primary/10"
                              required
                            />
                          </div>
                        </div>

                        {/* Subject */}
                        <div className="space-y-2">
                          <Label htmlFor="subject" className="text-sm font-semibold text-foreground">
                            Subject *
                          </Label>
                          <Input
                            id="subject"
                            placeholder="Brief description of your inquiry"
                            value={formData.subject}
                            onChange={(e) => handleInputChange('subject', e.target.value)}
                            className="h-12 border-2 transition-all duration-200 focus:border-primary focus:shadow-lg focus:shadow-primary/10"
                            required
                          />
                        </div>

                        {/* Message */}
                        <div className="space-y-2">
                          <Label htmlFor="message" className="text-sm font-semibold text-foreground">
                            Message *
                          </Label>
                          <Textarea
                            id="message"
                            placeholder="Tell us more about your inquiry..."
                            value={formData.message}
                            onChange={(e) => handleInputChange('message', e.target.value)}
                            rows={6}
                            className="border-2 transition-all duration-200 focus:border-primary focus:shadow-lg focus:shadow-primary/10 resize-none"
                            required
                          />
                        </div>

                        {/* Submit Button */}
                        <Button
                          type="submit"
                          variant="premium"
                          size="lg"
                          className="w-full h-12 text-base font-semibold group"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Sending...
                            </>
                          ) : (
                            <>
                              Send Message
                              <Send className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </>
                          )}
                        </Button>

                        {/* Privacy Notice */}
                        <p className="text-xs text-muted-foreground text-center">
                          By submitting this form, you agree to our privacy policy. We'll never share your information.
                        </p>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-muted/20 to-muted/10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-foreground mb-6">Common Questions</h2>
            <p className="text-xl text-muted-foreground">
              Quick answers to questions we hear most often.
            </p>
          </motion.div>

          <div className="space-y-6">
            {[
              {
                question: "How quickly will I get a response?",
                answer: "We aim to respond to all inquiries within 4 hours during business hours. For urgent technical issues, use our live chat for immediate assistance."
              },
              {
                question: "Do you offer phone support?",
                answer: "Yes! Our phone support is available Monday through Friday, 9 AM to 6 PM EST. Call us at +1 (555) 123-4567."
              },
              {
                question: "Can I schedule a demo?",
                answer: "Absolutely! Contact our sales team to schedule a personalized demo that shows how TenantFlow can work for your specific needs."
              },
              {
                question: "What if I need help outside business hours?",
                answer: "Our knowledge base and help center are available 24/7. For urgent issues, you can also submit a support ticket and we'll prioritize it for first thing the next business day."
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="border-0 bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-foreground mb-3">{faq.question}</h3>
                    <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}