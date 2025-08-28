'use client'

/**
 * Design Preview Page - Visual Mockup for TenantFlow Transformation
 * This allows you to see the new design concepts without affecting production
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

// Add custom animation keyframes
const customStyles = `
  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .animate-gradient-x {
    animation: gradientShift 3s ease infinite;
  }
`

type PreviewSection = 'hero' | 'dashboard' | 'properties' | 'features' | 'comparison'

export default function DesignPreviewPage() {
  const [activeSection, setActiveSection] = useState<PreviewSection>('hero')

  // Inject custom styles
  useEffect(() => {
    const styleElement = document.createElement('style')
    styleElement.textContent = customStyles
    document.head.appendChild(styleElement)
    return () => document.head.removeChild(styleElement)
  }, [])

  const sections = [
    { id: 'hero', label: 'Hero Section', emoji: '🏠' },
    { id: 'dashboard', label: 'Dashboard', emoji: '📊' },
    { id: 'properties', label: 'Properties', emoji: '🏢' },
    { id: 'features', label: 'Features', emoji: '✨' },
    { id: 'comparison', label: 'Before/After', emoji: '🔄' },
  ] as const

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Link href="/" className="text-white hover:text-gray-300 transition-colors">
                ← Back to TenantFlow
              </Link>
              <span className="text-gray-500">|</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-bold">
                Design Preview
              </span>
            </div>
            
            <div className="flex gap-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    activeSection === section.id
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {section.emoji} {section.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-16">
        <AnimatePresence mode="wait">
          {activeSection === 'hero' && <HeroPreview key="hero" />}
          {activeSection === 'dashboard' && <DashboardPreview key="dashboard" />}
          {activeSection === 'properties' && <PropertiesPreview key="properties" />}
          {activeSection === 'features' && <FeaturesPreview key="features" />}
          {activeSection === 'comparison' && <ComparisonPreview key="comparison" />}
        </AnimatePresence>
      </div>
    </div>
  )
}

function HeroPreview() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-screen overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900">
        {/* Animated Orbs */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-purple-400/30 to-pink-400/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
      </div>

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
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-3 text-white/90">
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

          {/* Main Headline with Gradient */}
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
              <div className="absolute inset-0 -top-2 -left-2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
            </motion.button>

            {/* Secondary CTA */}
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
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

function DashboardPreview() {
  const stats = [
    { label: 'Total Revenue', value: '$847,392', change: '+23.4%', color: 'from-green-400 to-emerald-600' },
    { label: 'Properties', value: '247', change: '+12', color: 'from-blue-400 to-purple-600' },
    { label: 'Tenants', value: '1,893', change: '+89', color: 'from-purple-400 to-pink-600' },
    { label: 'Occupancy', value: '96.8%', change: '+2.1%', color: 'from-amber-400 to-orange-600' }
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 mb-4">
            Your Empire
          </h1>
          <p className="text-xl text-white/60">
            Real-time insights into your property management success
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300"
            >
              <div className="space-y-3">
                <p className="text-sm text-white/60 uppercase tracking-wide">
                  {stat.label}
                </p>
                <p className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${stat.color}`}>
                  {stat.value}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-green-400 text-sm font-medium">
                    ↗ {stat.change}
                  </div>
                  <span className="text-xs text-white/40">vs last month</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Property Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              whileHover={{ scale: 1.02, rotateY: 5 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-500"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="h-32 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-xl mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Luxury Property {i}</h3>
              <div className="flex justify-between items-center">
                <span className={`text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${i === 1 ? 'from-green-400 to-emerald-600' : i === 2 ? 'from-blue-400 to-purple-600' : 'from-amber-400 to-orange-600'}`}>
                  ${(Math.random() * 50 + 20).toFixed(0)}k
                </span>
                <span className="text-sm text-white/60">98.{i}% occupied</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function PropertiesPreview() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-amber-900/20 via-orange-900/20 to-amber-900/20 p-6"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 mb-4">
            Premium Properties
          </h1>
          <p className="text-xl text-white/70">Your luxury real estate portfolio</p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ 
                scale: 1.05, 
                rotateX: 5,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
              }}
              className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden hover:border-amber-500/50 transition-all duration-500"
            >
              <div className="h-48 bg-gradient-to-r from-amber-400/30 to-orange-500/30 relative">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDIwIDAgTCAwIDAgMCAyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">Downtown Luxury {i}</h3>
                <p className="text-white/60 text-sm mb-4">Premium property in the heart of the city</p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                    ${(i * 125 + 1500).toLocaleString()}/mo
                  </span>
                  <span className="text-green-400 font-medium">100% occupied</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function FeaturesPreview() {
  const features = [
    { title: 'AI-Powered Analytics', desc: 'Smart insights that grow your revenue', gradient: 'from-purple-400 to-pink-600' },
    { title: 'Automated Collections', desc: 'Never chase rent payments again', gradient: 'from-green-400 to-blue-500' },
    { title: 'Tenant Portal', desc: 'Self-service that delights residents', gradient: 'from-blue-400 to-purple-600' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-purple-900/30 via-pink-900/20 to-purple-900/30 p-6"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-purple-400 mb-6">
            Next-Gen Features
          </h1>
          <p className="text-xl text-white/70">Technology that transforms property management</p>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              whileHover={{ y: -10 }}
              className="text-center"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={`w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-r ${feature.gradient} p-6`}
              >
                <div className="w-full h-full bg-white/20 rounded-2xl" />
              </motion.div>
              <h3 className={`text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${feature.gradient} mb-4`}>
                {feature.title}
              </h3>
              <p className="text-white/70 text-lg">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function ComparisonPreview() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-black p-6"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4">
            Before vs After Transformation
          </h1>
          <p className="text-xl text-gray-400">See the dramatic difference your new design will make</p>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Before */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-red-400 text-center">❌ Current Design</h2>
            <div className="bg-gray-100 rounded-lg p-8 space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <h3 className="text-blue-900 font-medium">Property Management Made Simple</h3>
                <p className="text-blue-700 text-sm mt-1">Basic corporate messaging</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white border border-gray-200 rounded p-4 text-center">
                    <div className="text-2xl font-bold text-gray-800">{i * 25}%</div>
                    <div className="text-xs text-gray-600">Feature {i}</div>
                  </div>
                ))}
              </div>
              <button className="w-full bg-blue-500 text-white py-3 rounded font-medium hover:bg-blue-600">
                Start Free Trial
              </button>
            </div>
          </motion.div>

          {/* After */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-green-400 text-center">✅ New Luxury Design</h2>
            <div className="bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 rounded-lg p-8 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-2xl" />
              <div className="relative">
                <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400">
                  Property Perfected
                </h3>
                <p className="text-white/80 text-sm mt-2">Luxury real estate technology</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <motion.div 
                    key={i} 
                    whileHover={{ scale: 1.05 }}
                    className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4 text-center hover:bg-white/20 transition-all"
                  >
                    <div className={`text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r ${
                      i === 1 ? 'from-green-400 to-emerald-600' : 
                      i === 2 ? 'from-blue-400 to-purple-600' : 
                      'from-amber-400 to-orange-600'
                    }`}>
                      {i * 25}%
                    </div>
                    <div className="text-xs text-white/60">Feature {i}</div>
                  </motion.div>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-black py-4 rounded-xl font-bold text-lg relative overflow-hidden group"
              >
                <span className="relative z-10">Start Free Trial</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}