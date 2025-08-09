'use client';

import { motion } from '@/lib/framer-motion';
import { cardVariants } from './dashboard-animations';

interface DashboardHeaderProps {
  userEmail?: string;
  selectedPeriod: '7d' | '30d' | '90d';
  onPeriodChange: (period: '7d' | '30d' | '90d') => void;
}

export function DashboardHeader({ 
  userEmail, 
  selectedPeriod, 
  onPeriodChange 
}: DashboardHeaderProps) {
  const username = userEmail?.split('@')[0] || 'User';

  const periodOptions = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' }
  ] as const;

  return (
    <motion.div 
      variants={cardVariants} 
      className="flex flex-col lg:flex-row lg:items-center lg:justify-between"
    >
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {username}
        </h1>
        <p className="text-white/70">
          Here&apos;s what&apos;s happening with your properties today
        </p>
      </div>
      
      <div className="mt-4 lg:mt-0">
        <div className="flex items-center space-x-2 bg-white/10 rounded-lg p-1 backdrop-blur-sm">
          {periodOptions.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onPeriodChange(key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                selectedPeriod === key
                  ? 'bg-white text-[#1e3a5f] shadow-lg'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}