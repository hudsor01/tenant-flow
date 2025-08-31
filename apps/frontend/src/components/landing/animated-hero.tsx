'use client'

import { motion } from 'framer-motion'
import { Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export function AnimatedHero() {
  return (
    <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50" />
      
      <motion.div 
        className="relative max-w-7xl mx-auto"
        initial="initial"
        animate="animate"
        variants={staggerContainer}
      >
        <div className="text-center space-y-8">
          <motion.div 
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors duration-200 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-[13px] font-medium text-gray-700">Trusted by 10,000+ Property Managers</span>
          </motion.div>
          
          <motion.h1 
            variants={fadeInUp}
            className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1]"
          >
            Property Management
            <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent animate-gradient bg-300%">
              Reimagined
            </span>
          </motion.h1>
          
          <motion.p 
            variants={fadeInUp}
            className="max-w-2xl mx-auto text-lg md:text-xl text-gray-600 leading-relaxed"
          >
            The modern platform that streamlines property operations, automates workflows, 
            and delivers insights that drive growth.
          </motion.p>
          
          <motion.div 
            variants={fadeInUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link href="/auth/register">
              <Button className="h-12 px-8 text-[15px] font-medium bg-gray-900 hover:bg-gray-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                Start 14-Day Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" className="h-12 px-8 text-[15px] font-medium border-gray-300 hover:bg-gray-50 hover:scale-105 transition-all duration-200">
                Watch Demo
              </Button>
            </Link>
          </motion.div>
          
          <motion.div 
            variants={fadeInUp}
            className="flex items-center justify-center gap-8 pt-8"
          >
            {[
              { value: '10K+', label: 'Active Users' },
              { value: '500K+', label: 'Properties' },
              { value: '99.9%', label: 'Uptime' },
              { value: '4.9/5', label: 'Rating' }
            ].map((stat, index) => (
              <div key={index} className="flex items-center gap-8">
                <div className="text-center hover:scale-110 transition-transform duration-200">
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-[13px] text-gray-600">{stat.label}</div>
                </div>
                {index < 3 && <div className="w-px h-8 bg-gray-200" />}
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
        .bg-300\% {
          background-size: 300% 300%;
        }
      `}</style>
    </section>
  )
}