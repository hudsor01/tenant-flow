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
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`
        btn-modern card-modern relative w-full p-4 rounded-xl border backdrop-blur-sm
        bg-background/80 ${colorClasses[color]}
        transition-all var(--transition-normal) text-left
        disabled:opacity-50 disabled:cursor-not-allowed
        hover:shadow-md group
      `}
    >
      <div className="flex items-center space-x-4">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
          <Icon className="w-5 h-5 text-primary transition-colors duration-300" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-foreground transition-colors duration-300">
            {title}
          </h4>
          <p className="text-sm text-muted-foreground transition-colors duration-300">
            {description}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-primary/10 opacity-50 group-hover:opacity-100 transition-all duration-300 group-hover:bg-primary/20">
          <Plus className="w-4 h-4 text-primary" />
        </div>
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
      <div className="card-modern bg-card backdrop-blur-sm rounded-xl border p-6">
        <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 mr-3">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          Quick Actions
        </h3>
        <div className="space-y-4">
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