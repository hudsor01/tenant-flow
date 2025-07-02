import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowRight, 
  Zap, 
  Building, 
  Users, 
  Crown,
  TrendingUp,
  Shield,
  Star
} from 'lucide-react';
import { useCreateCheckoutSession, useUserPlan, useUsageMetrics } from '@/hooks/useSubscription';
import { PLANS } from '@/types/subscription';

interface ContextualUpgradeCTAProps {
  context: 'property_limit' | 'tenant_limit' | 'storage_limit' | 'feature_upsell' | 'dashboard_widget';
  className?: string;
  size?: 'compact' | 'default' | 'large';
  customMessage?: string;
}

const contextConfig = {
  property_limit: {
    icon: Building,
    title: 'Property Limit Reached',
    description: 'Add unlimited properties with Growth plan',
    gradient: 'from-primary to-primary/80',
    suggestedPlan: 'growth' as const,
    benefits: ['Up to 50 properties', 'Advanced analytics', 'Bulk operations']
  },
  tenant_limit: {
    icon: Users,
    title: 'Tenant Limit Reached', 
    description: 'Manage more tenants with our Growth plan',
    gradient: 'from-primary/90 to-accent',
    suggestedPlan: 'growth' as const,
    benefits: ['Up to 500 tenants', 'Tenant portal', 'Automated communications']
  },
  storage_limit: {
    icon: Shield,
    title: 'Storage Almost Full',
    description: 'Get 10GB+ storage with Growth plan',
    gradient: 'from-destructive to-destructive/80',
    suggestedPlan: 'growth' as const,
    benefits: ['10GB storage', 'Document management', 'Secure file sharing']
  },
  feature_upsell: {
    icon: Star,
    title: 'Unlock Premium Features',
    description: 'Get advanced tools for property management',
    gradient: 'from-primary to-accent',
    suggestedPlan: 'starter' as const,
    benefits: ['Advanced reporting', 'API access', 'Priority support']
  },
  dashboard_widget: {
    icon: TrendingUp,
    title: 'Scale Your Business',
    description: 'Manage more properties with confidence',
    gradient: 'from-primary to-primary/70',
    suggestedPlan: 'growth' as const,
    benefits: ['Professional tools', 'Advanced insights', 'Growth features']
  }
};

export function ContextualUpgradeCTA({ 
  context, 
  className = '', 
  size = 'default',
  customMessage 
}: ContextualUpgradeCTAProps) {
  const { data: userPlan } = useUserPlan();
  const { data: usage } = useUsageMetrics();
  const createCheckoutSession = useCreateCheckoutSession();
  
  const config = contextConfig[context];
  const suggestedPlan = PLANS.find(p => p.id === config.suggestedPlan);
  
  if (!suggestedPlan || userPlan?.id === 'enterprise') {
    return null; // Don't show for enterprise users
  }

  const IconComponent = config.icon;
  
  const handleUpgrade = () => {
    createCheckoutSession.mutate({
      planId: config.suggestedPlan,
      billingPeriod: 'monthly',
      successUrl: `${window.location.origin}/dashboard?upgrade=success`,
      cancelUrl: `${window.location.origin}/dashboard?upgrade=cancelled`
    });
  };

  // Calculate usage percentage for progress bars
  const getUsagePercentage = (current: number, limit: number | 'unlimited') => {
    if (limit === 'unlimited') return 0;
    return Math.min((current / limit) * 100, 100);
  };

  if (size === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-3 bg-gradient-to-r ${config.gradient} text-white rounded-lg shadow-sm ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <IconComponent className="h-4 w-4" />
            <span className="text-sm font-medium">{config.title}</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleUpgrade}
            disabled={createCheckoutSession.isPending}
            className="bg-background/20 hover:bg-background/30 text-primary-foreground border-background/30"
          >
            Upgrade
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </motion.div>
    );
  }

  if (size === 'large') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={className}
      >
        <Card className="overflow-hidden border-0 shadow-xl">
          <div className={`bg-gradient-to-br ${config.gradient} p-6 text-white relative`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-background/10 rounded-full -translate-y-16 translate-x-16" />
            
            <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  <IconComponent className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{config.title}</h3>
                  <p className="text-white/90">{customMessage || config.description}</p>
                </div>
              </div>

              {/* Usage metrics for relevant contexts */}
              {(context === 'property_limit' || context === 'tenant_limit') && usage && userPlan && (
                <div className="bg-background/20 rounded-lg p-3 backdrop-blur-sm mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Current usage</span>
                    <span>
                      {context === 'property_limit' ? usage.propertiesCount : usage.tenantsCount} / {' '}
                      {context === 'property_limit' ? userPlan.limits.properties : userPlan.limits.tenants}
                    </span>
                  </div>
                  <Progress 
                    value={context === 'property_limit' 
                      ? getUsagePercentage(usage.propertiesCount, userPlan.limits.properties)
                      : getUsagePercentage(usage.tenantsCount, userPlan.limits.tenants)
                    } 
                    className="bg-background/30"
                  />
                </div>
              )}
            </div>
          </div>

          <CardContent className="p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold">{suggestedPlan.name} Plan</h4>
                  <p className="text-muted-foreground">Recommended for your needs</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">${suggestedPlan.monthlyPrice}</div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {config.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleUpgrade}
                disabled={createCheckoutSession.isPending}
                className={`w-full h-12 bg-gradient-to-r ${config.gradient} hover:opacity-90 transition-opacity`}
                size="lg"
              >
                {createCheckoutSession.isPending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                    Processing...
                  </div>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Upgrade to {suggestedPlan.name}
                  </>
                )}
              </Button>

              <div className="text-center">
                <Badge variant="secondary" className="text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  14-day free trial • Cancel anytime
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Default size
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2 bg-gradient-to-r ${config.gradient} text-white rounded-lg`}>
              <IconComponent className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{config.title}</CardTitle>
              <CardDescription>{customMessage || config.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">{suggestedPlan.name} Plan</div>
              <div className="text-2xl font-bold">${suggestedPlan.monthlyPrice}<span className="text-sm font-normal text-muted-foreground">/month</span></div>
            </div>
            <Button
              onClick={handleUpgrade}
              disabled={createCheckoutSession.isPending}
              className="ml-4"
            >
              {createCheckoutSession.isPending ? 'Loading...' : 'Upgrade Now'}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Preset components for common use cases
export function PropertyLimitCTA(props: Omit<ContextualUpgradeCTAProps, 'context'>) {
  return <ContextualUpgradeCTA {...props} context="property_limit" />;
}

export function TenantLimitCTA(props: Omit<ContextualUpgradeCTAProps, 'context'>) {
  return <ContextualUpgradeCTA {...props} context="tenant_limit" />;
}

export function DashboardUpgradeCTA(props: Omit<ContextualUpgradeCTAProps, 'context'>) {
  return <ContextualUpgradeCTA {...props} context="dashboard_widget" />;
}