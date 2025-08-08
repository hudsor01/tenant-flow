'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Wrench, Users, FileText, Calendar, CheckCircle, AlertTriangle, Activity } from 'lucide-react';
import { cardVariants, activityItemVariants } from './dashboard-animations';

interface ActivityItem {
  id: string | number;
  type: 'maintenance' | 'tenant' | 'lease' | string;
  title: string;
  description: string;
  timestamp: string;
  status?: 'completed' | 'urgent' | string;
}

interface DashboardActivityFeedProps {
  activities?: ActivityItem[];
  isLoading?: boolean;
}

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case 'maintenance':
      return <Wrench className="w-4 h-4" />;
    case 'tenant':
      return <Users className="w-4 h-4" />;
    case 'lease':
      return <FileText className="w-4 h-4" />;
    default:
      return <Calendar className="w-4 h-4" />;
  }
}

function ActivityStatusIcon({ status }: { status?: string }) {
  if (status === 'completed') {
    return <CheckCircle className="w-3 h-3 text-emerald-400 mr-1" />;
  }
  if (status === 'urgent') {
    return <AlertTriangle className="w-3 h-3 text-red-400 mr-1" />;
  }
  return null;
}

function getActivityColorClasses(type: string) {
  switch (type) {
    case 'maintenance':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'tenant':
      return 'bg-blue-500/20 text-blue-400';
    case 'lease':
      return 'bg-purple-500/20 text-purple-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}

function getStatusColorClasses(status?: string) {
  switch (status) {
    case 'completed':
      return 'text-emerald-400';
    case 'urgent':
      return 'text-red-400';
    default:
      return 'text-white/60';
  }
}

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
                  <p className="text-white font-medium">{activity.title}</p>
                  <p className="text-white/60 text-sm">{activity.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/40 text-xs">{activity.timestamp}</p>
                  {activity.status && (
                    <div className="flex items-center mt-1">
                      <ActivityStatusIcon status={activity.status} />
                      <span className={`text-xs ${getStatusColorClasses(activity.status)}`}>
                        {activity.status}
                      </span>
                    </div>
                  )}
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