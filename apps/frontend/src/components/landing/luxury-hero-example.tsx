'use client'

/**
 * Luxury Hero Section - Design Revolution Example
 * This shows what's possible with your current tech stack
 */

import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { useRef } from 'react'

export function LuxuryHeroExample() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  })
  
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%'])
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0])

  return (
    <div ref={ref} className="relative min-h-screen overflow-hidden">
      {/* Animated Background */}
      <motion.div 
        style={{ y, opacity }}
        className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900"
      >
        {/* Floating Glass Orbs */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
        <div className="text-center max-w-6xl mx-auto">
          {/* Trust Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 text-white/90">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <motion.svg
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="w-4 h-4 fill-yellow-400 text-yellow-400"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </motion.svg>
                ))}
              </div>
              <span className="text-sm font-medium">4.9/5 • 10,000+ Property Managers</span>
            </div>
          </motion.div>

          {/* Main Headline */}
          <div className="mb-8">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-6xl md:text-8xl lg:text-9xl font-black text-white leading-none tracking-tight"
            >
              Property_
              <br />
              <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 bg-clip-text text-transparent">
                Perfected
              </span>
            </motion.h1>
          </div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-12 text-xl md:text-2xl text-white/80 max-w-4xl mx-auto leading-relaxed"
          >
            The only property management platform that feels like luxury.
            <br />
            <span className="text-amber-400 font-semibold">10,000+ managers</span> saving 
            <span className="text-amber-400 font-semibold"> 15+ hours weekly</span>.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            {/* Primary CTA */}
            <Link href="/signup">
              <motion.button
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 20px 40px -10px rgba(251, 191, 36, 0.3)"
                }}
                whileTap={{ scale: 0.98 }}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-8 py-4 font-bold text-black text-lg transition-all duration-300"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start Free Trial
                  <motion.svg
                    className="w-5 h-5"
                    initial={{ x: 0 }}
                    whileHover={{ x: 5 }}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </motion.svg>
                </span>
                {/* Shine effect */}
                <div className="absolute inset-0 -top-2 -left-2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              </motion.button>
            </Link>

            {/* Secondary CTA */}
            <Link href="/demo">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 px-8 py-4 font-semibold text-white hover:bg-white/20 transition-all duration-300"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Watch Demo
              </motion.button>
            </Link>
          </motion.div>

          {/* Floating Property Cards */}
          <div className="absolute top-1/2 left-10 -translate-y-1/2 hidden lg:block">
            <motion.div
              animate={{
                y: [0, -20, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-64 h-40 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-4"
            >
              <div className="h-20 bg-gradient-to-r from-purple-400/30 to-pink-400/30 rounded-xl mb-3" />
              <div className="space-y-2">
                <div className="h-3 bg-white/30 rounded w-3/4" />
                <div className="h-3 bg-white/20 rounded w-1/2" />
              </div>
            </motion.div>
          </div>

          <div className="absolute top-1/4 right-10 hidden lg:block">
            <motion.div
              animate={{
                y: [0, 15, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
              className="w-48 h-32 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-3"
            >
              <div className="h-16 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-lg mb-2" />
              <div className="h-2 bg-white/20 rounded w-2/3" />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}