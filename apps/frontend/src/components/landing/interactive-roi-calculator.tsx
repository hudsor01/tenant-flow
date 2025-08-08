/**
 * Interactive ROI Calculator - Client Component
 * Handles user input and real-time calculation updates
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Calculator } from 'lucide-react'

interface InteractiveRoiCalculatorProps {
  locale: string
}

export function InteractiveRoiCalculator({ locale }: InteractiveRoiCalculatorProps) {
  const [monthlyUnits, setMonthlyUnits] = useState('25')
  const [savings, setSavings] = useState({ time: 0, money: 0 })

  useEffect(() => {
    const units = parseInt(monthlyUnits) || 0
    setSavings({
      time: Math.round(units * 0.5), // 30 min saved per unit
      money: Math.round(units * 127) // $127 saved per unit monthly
    })
  }, [monthlyUnits])

  return (
    <section className="py-16 px-4 bg-white">
      <div className="container mx-auto max-w-4xl">
        <Card className="p-8 shadow-xl border-2 border-blue-100">
          <div className="text-center mb-8">
            <Badge className="bg-green-100 text-green-700 mb-4">ROI CALCULATOR</Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              See How Much You'll Save
            </h2>
            <p className="text-gray-600">Calculate your return on investment in seconds</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How many units do you manage?
              </label>
              <Input
                type="number"
                value={monthlyUnits}
                onChange={(e) => setMonthlyUnits(e.target.value)}
                className="text-2xl font-bold text-center"
                min="1"
                max="500"
              />
              <input
                type="range"
                min="1"
                max="100"
                value={monthlyUnits}
                onChange={(e) => setMonthlyUnits(e.target.value)}
                className="w-full mt-4"
              />
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-4">Your Monthly Savings:</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Time Saved:</span>
                  <span className="text-2xl font-bold text-green-600">{savings.time} hours</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Money Saved:</span>
                  <span className="text-2xl font-bold text-green-600">${savings.money}</span>
                </div>
                <div className="pt-3 border-t border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Annual ROI:</span>
                    <span className="text-3xl font-bold text-green-700">
                      {Math.round((savings.money * 12) / (79 * 12) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link href={`/${locale}/signup`}>
              <Button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3">
                Start Saving Now
                <Calculator className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </section>
  )
}