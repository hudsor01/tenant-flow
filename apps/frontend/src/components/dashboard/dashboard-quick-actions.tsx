'use client';

import { useTransition } from 'react';
import { logger } from '@/lib/logger'
import { motion } from '@/lib/framer-motion';
import { Building2, Users, Wrench, FileText, Plus, Activity } from 'lucide-react';
import { cardVariants } from './dashboard-animations';

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  color: 'navy' | 'steel' | 'emerald' | 'gold';
}

function QuickAction({ title, description, icon: Icon, onClick, color }: QuickActionProps) {
  const [isPending, startTransition] = useTransition();
  
  const colorClasses = {
    navy: 'hover:bg-[#1e3a5f]/20 border-[#4a7ba3]/30 text-[#60a5fa]',
    steel: 'hover:bg-[#475569]/20 border-[#94a3b8]/30 text-[#94a3b8]',
    emerald: 'hover:bg-[#065f46]/20 border-[#10b981]/30 text-[#34d399]',
    gold: 'hover:bg-[#92400e]/20 border-[#f59e0b]/30 text-[#fbbf24]'
  };

  const handleClick = () => {
    startTransition(() => {
      onClick();
    });
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={isPending}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative w-full p-4 rounded-lg border backdrop-blur-sm
        bg-white/5 ${colorClasses[color]}
        transition-all duration-200 text-left
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-white/10">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-white">
            {title}
          </h4>
          <p className="text-sm text-white/60">
            {description}
          </p>
        </div>
        <Plus className="w-4 h-4 text-white/40" />
      </div>
    </motion.button>
  );
}

interface QuickActionsPanelProps {
  onAddProperty?: () => void;
  onNewTenant?: () => void;
  onScheduleMaintenance?: () => void;
  onGenerateReport?: () => void;
}

const defaultQuickActions = [
  {
    title: 'Add Property',
    description: 'Register a new property to your portfolio',
    icon: Building2,
    color: 'navy' as const,
    action: 'onAddProperty' as const
  },
  {
    title: 'New Tenant',
    description: 'Onboard a new tenant to your system',
    icon: Users,
    color: 'steel' as const,
    action: 'onNewTenant' as const
  },
  {
    title: 'Schedule Maintenance',
    description: 'Create a maintenance request or task',
    icon: Wrench,
    color: 'emerald' as const,
    action: 'onScheduleMaintenance' as const
  },
  {
    title: 'Generate Report',
    description: 'Create financial or operational reports',
    icon: FileText,
    color: 'gold' as const,
    action: 'onGenerateReport' as const
  }
];

export function DashboardQuickActions({
  onAddProperty,
  onNewTenant,
  onScheduleMaintenance,
  onGenerateReport
}: QuickActionsPanelProps) {
  const actionHandlers = {
    onAddProperty: onAddProperty || (() => logger.info('Add property clicked', { component: 'dashboardquickactions' })),
    onNewTenant: onNewTenant || (() => logger.info('New tenant clicked', { component: 'dashboardquickactions' })),
    onScheduleMaintenance: onScheduleMaintenance || (() => logger.info('Schedule maintenance clicked', { component: 'dashboardquickactions' })),
    onGenerateReport: onGenerateReport || (() => logger.info('Generate report clicked', { component: 'dashboardquickactions' }))
  };

  return (
    <motion.div variants={cardVariants} className="lg:col-span-1">
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-[#60a5fa]" />
          Quick Actions
        </h3>
        <div className="space-y-3">
          {defaultQuickActions.map((action) => (
            <QuickAction 
              key={action.title}
              title={action.title}
              description={action.description}
              icon={action.icon}
              onClick={actionHandlers[action.action]}
              color={action.color}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}