'use client'

/**
 * Simple Design Preview - Guaranteed to Work
 * Visual demonstration of TenantFlow design transformation
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function SimpleDesignPreview() {
  const [activeView, setActiveView] = useState<'before' | 'after'>('after')

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-gray-400 hover:text-white">
              ← Back to TenantFlow
            </Link>
            <h1 className="text-xl font-bold">Design Preview</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveView('before')}
                className={`px-4 py-2 rounded-lg text-sm ${
                  activeView === 'before' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                Before
              </button>
              <button
                onClick={() => setActiveView('after')}
                className={`px-4 py-2 rounded-lg text-sm ${
                  activeView === 'after' 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                After (New)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeView === 'before' ? <BeforeDesign /> : <AfterDesign />}
      </div>
    </div>
  )
}

function BeforeDesign() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-red-400 mb-4">❌ Current Design</h2>
        <p className="text-gray-400">Generic SaaS template look</p>
      </div>

      {/* Mock Current Design */}
      <div className="bg-white rounded-lg p-8 text-black">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-4">
            Property Management Made Simple
          </h1>
          <p className="text-blue-700 text-lg">
            Manage your properties efficiently with our platform
          </p>
          <button className="mt-6 bg-blue-500 text-white px-8 py-3 rounded font-medium hover:bg-blue-600">
            Get Started
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { title: 'Easy Management', stat: '95%' },
            { title: 'Save Time', stat: '40hrs' },
            { title: 'Happy Tenants', stat: '4.2★' }
          ].map((item, i) => (
            <div key={i} className="bg-gray-50 border rounded-lg p-6 text-center">
              <div className="text-2xl font-bold text-gray-800 mb-2">{item.stat}</div>
              <div className="text-sm text-gray-600">{item.title}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function AfterDesign() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-6xl mx-auto"
    >
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-green-400 mb-4">✅ New Luxury Design</h2>
        <p className="text-gray-400">Premium property management experience</p>
      </div>

      {/* Hero Section Preview */}
      <div className="relative mb-16 rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900"></div>
        
        {/* Floating orbs */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-r from-purple-400/30 to-pink-400/30 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full blur-2xl animate-pulse"></div>

        <div className="relative z-10 text-center py-20 px-8">
          {/* Trust badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-6 py-3">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-sm">★</span>
                ))}
              </div>
              <span className="text-sm text-white/90">4.9/5 • 10,000+ Managers</span>
            </div>
          </motion.div>

          {/* Main headline with gradient */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h1 className="text-5xl md:text-7xl font-black text-white leading-tight tracking-tight">
              Property_
              <br />
              <span 
                className="text-transparent bg-clip-text"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #fbbf24 100%)'
                }}
              >
                Perfected
              </span>
            </h1>
          </motion.div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-white/80 mb-10 max-w-3xl mx-auto"
          >
            The only property management platform that feels like luxury.
            <br />
            <span className="text-yellow-400 font-semibold">10,000+ managers</span> saving 
            <span className="text-yellow-400 font-semibold"> 15+ hours weekly</span>.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              Start Free Trial →
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-white/20 transition-all"
            >
              ▶ Watch Demo
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Dashboard Stats Preview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Revenue', value: '$847K', color: 'from-green-400 to-emerald-600', change: '+23%' },
          { label: 'Properties', value: '247', color: 'from-blue-400 to-purple-600', change: '+12' },
          { label: 'Tenants', value: '1,893', color: 'from-purple-400 to-pink-600', change: '+89' },
          { label: 'Occupancy', value: '96.8%', color: 'from-amber-400 to-orange-600', change: '+2.1%' }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + i * 0.1 }}
            whileHover={{ scale: 1.05 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
          >
            <p className="text-sm text-white/60 uppercase tracking-wide mb-2">{stat.label}</p>
            <p 
              className="text-3xl font-black mb-2 text-transparent bg-clip-text"
              style={{
                backgroundImage: `linear-gradient(135deg, ${stat.color.split(' ')[0].replace('from-', '#')} 0%, ${stat.color.split(' ')[2].replace('to-', '#')} 100%)`
                  .replace('green-400', '4ade80')
                  .replace('emerald-600', '059669')
                  .replace('blue-400', '60a5fa')
                  .replace('purple-600', '9333ea')
                  .replace('purple-400', 'a855f7')
                  .replace('pink-600', 'db2777')
                  .replace('amber-400', 'fbbf24')
                  .replace('orange-600', 'ea580c')
              }}
            >
              {stat.value}
            </p>
            <div className="text-green-400 text-sm font-medium">
              ↗ {stat.change} <span className="text-white/40 font-normal">vs last month</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Property Cards Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {[
          { name: 'Downtown Luxury Lofts', revenue: '$47K', occupancy: '100%' },
          { name: 'Riverside Apartments', revenue: '$33K', occupancy: '98%' },
          { name: 'Garden View Complex', revenue: '$29K', occupancy: '95%' }
        ].map((property, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 + i * 0.1 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all duration-300"
          >
            <div className="h-32 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-2xl mb-4 flex items-center justify-center">
              <div className="text-4xl">🏢</div>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{property.name}</h3>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wide">Monthly Revenue</p>
                <p className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
                  {property.revenue}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/50 uppercase tracking-wide">Occupancy</p>
                <p className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
                  {property.occupancy}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}