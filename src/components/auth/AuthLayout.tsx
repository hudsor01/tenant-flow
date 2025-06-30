import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Sparkles, Shield, TrendingUp } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  side?: 'left' | 'right';
  title: string;
  subtitle: string;
  image: {
    src: string;
    alt: string;
  };
  heroContent: {
    title: string;
    description: string;
  };
  features?: Array<{
    icon: React.ReactNode;
    title: string;
    description: string;
  }>;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  side = 'left',
  title,
  subtitle,
  image,
  heroContent,
  features = [
    {
      icon: <Shield className="h-5 w-5" />,
      title: "Secure & Reliable",
      description: "Bank-level security for your property data"
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: "Boost Efficiency",
      description: "Streamline operations by up to 60%"
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: "Modern Interface",
      description: "Intuitive design that just works"
    }
  ]
}) => {
  const formSection = (
    <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      {/* Subtle background patterns */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-secondary/10 to-transparent rounded-full blur-3xl" />
      
      <motion.div
        initial={{ opacity: 0, x: side === 'left' ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Enhanced Branding */}
        <div className="mb-10">
          <motion.div 
            className="flex items-center mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="relative">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-600 rounded-2xl shadow-lg shadow-blue-600/25">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-green-400 to-green-500 rounded-full animate-pulse" />
            </div>
            <div className="ml-4">
              <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                TenantFlow
              </span>
              <div className="text-xs text-muted-foreground font-medium">Property Management</div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-3xl font-bold text-foreground mb-3 leading-tight">
              {title}
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {subtitle}
            </p>
          </motion.div>
        </div>

        {/* Form Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  );

  const imageSection = (
    <motion.div
      className="hidden lg:block lg:w-1/2 relative overflow-hidden"
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
      {/* Enhanced gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 via-purple-600/20 to-indigo-600/30 z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-20" />
      
      {/* Hero image */}
      <img
        src={image.src}
        alt={image.alt}
        className="h-full w-full object-cover"
      />
      
      {/* Hero content with enhanced styling */}
      <div className="absolute bottom-0 left-0 right-0 z-30 p-10 text-white">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <h2 className="text-4xl font-bold mb-4 leading-tight">
            {heroContent.title}
          </h2>
          <p className="text-lg opacity-90 mb-8 leading-relaxed">
            {heroContent.description}
          </p>
          
          {/* Feature highlights */}
          <div className="grid grid-cols-1 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="flex items-center gap-3 text-white/90"
              >
                <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-lg backdrop-blur-sm">
                  {feature.icon}
                </div>
                <div>
                  <div className="font-semibold text-sm">{feature.title}</div>
                  <div className="text-xs opacity-75">{feature.description}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Floating elements for visual interest */}
      <div className="absolute top-20 right-20 w-2 h-2 bg-white/30 rounded-full animate-pulse" />
      <div className="absolute top-32 right-32 w-1 h-1 bg-white/40 rounded-full animate-ping" />
      <div className="absolute bottom-32 right-16 w-3 h-3 bg-white/20 rounded-full animate-pulse" />
    </motion.div>
  );

  if (side === 'right') {
    return (
      <div className="min-h-screen flex">
        {imageSection}
        {formSection}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {formSection}
      {imageSection}
    </div>
  );
};

export default AuthLayout;