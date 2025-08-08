'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Wrench, Users, FileText, Calendar, CheckCircle, Activity } from 'lucide-react';
import { cardVariants, activityItemVariants } from './dashboard-animations';

// Use the type from the dashboard hooks for consistency
interface ActivityItem {
  id: string;
  type: 'tenant_added' | 'lease_created' | 'maintenance_request' | 'payment_received' | string;
  description: string;
  timestamp: Date | string;
  entityId?: string;
}

interface DashboardActivityFeedProps {
  activities?: ActivityItem[];
  isLoading?: boolean;
}

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case 'maintenance_request':
    case 'maintenance':
      return <Wrench className="w-4 h-4" />;
    case 'tenant_added':
    case 'tenant':
      return <Users className="w-4 h-4" />;
    case 'lease_created':
    case 'lease':
      return <FileText className="w-4 h-4" />;
    case 'payment_received':
      return <CheckCircle className="w-4 h-4" />;
    default:
      return <Calendar className="w-4 h-4" />;
  }
}

// Removed - no longer used with new activity structure

function getActivityColorClasses(type: string) {
  switch (type) {
    case 'maintenance_request':
    case 'maintenance':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'tenant_added':
    case 'tenant':
      return 'bg-blue-500/20 text-blue-400';
    case 'lease_created':
    case 'lease':
      return 'bg-purple-500/20 text-purple-400';
    case 'payment_received':
      return 'bg-green-500/20 text-green-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}

// Removed - no longer used with new activity structure

export function DashboardActivityFeed({ activities, isLoading }: DashboardActivityFeedProps) {
  if (isLoading) {
    return (
      <motion.div variants={cardVariants} className="lg:col-span-2">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-[#60a5fa]" />
            Recent Activity
          </h3>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4 p-4 rounded-lg bg-white/5">
                  <div className="w-10 h-10 bg-white/10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                    <div className="h-3 bg-white/10 rounded w-1/2" />
                  </div>
                  <div className="h-3 bg-white/10 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={cardVariants} className="lg:col-span-2">
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-[#60a5fa]" />
          Recent Activity
        </h3>
        
        <div className="space-y-4">
          <AnimatePresence>
            {Array.isArray(activities) && activities.map((activity, index) => (
              <motion.div
                key={String(activity.id)}
                custom={index}
                variants={activityItemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex items-center space-x-4 p-4 rounded-lg bg-white/5 border border-white/10"
              >
                <div className={`p-2 rounded-lg ${getActivityColorClasses(activity.type)}`}>
                  <ActivityIcon type={activity.type} />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{activity.description}</p>
                  <p className="text-white/60 text-sm">Activity type: {activity.type.replace('_', ' ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/40 text-xs">
                    {typeof activity.timestamp === 'string' 
                      ? activity.timestamp 
                      : new Date(activity.timestamp).toLocaleString()
                    }
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {!Array.isArray(activities) || activities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60">No recent activity</p>
              <p className="text-white/40 text-sm">Activity will appear here as you manage your properties</p>
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}