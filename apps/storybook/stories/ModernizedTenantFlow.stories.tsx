import type { Meta, StoryObj } from '@storybook/react';
import { motion } from 'motion/react';
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

// Modernized Magic UI Components (inline for demo)
import React, { ComponentPropsWithoutRef, CSSProperties, useCallback, useEffect, useId, useRef, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

// Warp Background Component
interface WarpBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  perspective?: number;
  beamsPerSide?: number;
  beamSize?: number;
  beamDelayMax?: number;
  beamDelayMin?: number;
  beamDuration?: number;
  gridColor?: string;
}

const Beam = ({
  width,
  x,
  delay,
  duration,
}: {
  width: string | number;
  x: string | number;
  delay: number;
  duration: number;
}) => {
  const hue = Math.floor(Math.random() * 360);
  const ar = Math.floor(Math.random() * 10) + 1;

  return (
    <motion.div
      style={{
        "--x": `${x}`,
        "--width": `${width}`,
        "--aspect-ratio": `${ar}`,
        "--background": `linear-gradient(hsl(${hue} 80% 60%), transparent)`,
      } as CSSProperties}
      className={`absolute left-[var(--x)] top-0 [aspect-ratio:1/var(--aspect-ratio)] [background:var(--background)] [width:var(--width)]`}
      initial={{ y: "100cqmax", x: "-50%" }}
      animate={{ y: "-100%", x: "-50%" }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
};

const WarpBackground: React.FC<WarpBackgroundProps> = ({
  children,
  perspective = 100,
  className,
  beamsPerSide = 3,
  beamSize = 5,
  beamDelayMax = 3,
  beamDelayMin = 0,
  beamDuration = 3,
  gridColor = "var(--border)",
  ...props
}) => {
  const generateBeams = useCallback(() => {
    const beams = [];
    const cellsPerSide = Math.floor(100 / beamSize);
    const step = cellsPerSide / beamsPerSide;

    for (let i = 0; i < beamsPerSide; i++) {
      const x = Math.floor(i * step);
      const delay = Math.random() * (beamDelayMax - beamDelayMin) + beamDelayMin;
      beams.push({ x, delay });
    }
    return beams;
  }, [beamsPerSide, beamSize, beamDelayMax, beamDelayMin]);

  const topBeams = useMemo(() => generateBeams(), [generateBeams]);
  const rightBeams = useMemo(() => generateBeams(), [generateBeams]);
  const bottomBeams = useMemo(() => generateBeams(), [generateBeams]);
  const leftBeams = useMemo(() => generateBeams(), [generateBeams]);

  return (
    <div className={cn("relative rounded border p-20", className)} {...props}>
      <div
        style={{
          "--perspective": `${perspective}px`,
          "--grid-color": gridColor,
          "--beam-size": `${beamSize}%`,
        } as CSSProperties}
        className={
          "pointer-events-none absolute left-0 top-0 size-full overflow-hidden [clipPath:inset(0)] [container-type:size] [perspective:var(--perspective)] [transform-style:preserve-3d]"
        }
      >
        {/* top side */}
        <div className="absolute z-20 [transform-style:preserve-3d] [background-size:var(--beam-size)_var(--beam-size)] [background:linear-gradient(var(--grid-color)_0_1px,_transparent_1px_var(--beam-size))_50%_-0.5px_/var(--beam-size)_var(--beam-size),linear-gradient(90deg,_var(--grid-color)_0_1px,_transparent_1px_var(--beam-size))_50%_50%_/var(--beam-size)_var(--beam-size)] [container-type:inline-size] [height:100cqmax] [transform-origin:50%_0%] [transform:rotateX(-90deg)] [width:100cqi]">
          {topBeams.map((beam, index) => (
            <Beam
              key={`top-${index}`}
              width={`${beamSize}%`}
              x={`${beam.x * beamSize}%`}
              delay={beam.delay}
              duration={beamDuration}
            />
          ))}
        </div>
        {/* Add other sides as needed... */}
      </div>
      <div className="relative">{children}</div>
    </div>
  );
};

// Ripple Component
interface RippleProps extends ComponentPropsWithoutRef<"div"> {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
}

const Ripple = React.memo(function Ripple({
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 8,
  className,
  ...props
}: RippleProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 select-none [mask-image:linear-gradient(to_bottom,white,transparent)]",
        className,
      )}
      {...props}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 70;
        const opacity = mainCircleOpacity - i * 0.03;
        const animationDelay = `${i * 0.06}s`;

        return (
          <div
            key={i}
            className={`absolute animate-ripple rounded-full border bg-foreground/25 shadow-xl`}
            style={{
              width: `${size}px`,
              height: `${size}px`,
              opacity,
              animationDelay,
              borderStyle: "solid",
              borderWidth: "1px",
              borderColor: `var(--foreground)`,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) scale(1)",
            } as CSSProperties}
          />
        );
      })}
    </div>
  );
});

// RetroGrid Component
interface RetroGridProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  angle?: number;
  cellSize?: number;
  opacity?: number;
  lightLineColor?: string;
  darkLineColor?: string;
}

const RetroGrid = ({
  className,
  angle = 65,
  cellSize = 60,
  opacity = 0.5,
  lightLineColor = "gray",
  darkLineColor = "gray",
  ...props
}: RetroGridProps) => {
  const gridStyles = {
    "--grid-angle": `${angle}deg`,
    "--cell-size": `${cellSize}px`,
    "--opacity": opacity,
    "--light-line": lightLineColor,
    "--dark-line": darkLineColor,
  } as CSSProperties;

  return (
    <div
      className={cn(
        "pointer-events-none absolute size-full overflow-hidden [perspective:200px]",
        `opacity-[var(--opacity)]`,
        className,
      )}
      style={gridStyles}
      {...props}
    >
      <div className="absolute inset-0 [transform:rotateX(var(--grid-angle))]">
        <div className="animate-grid [background-image:linear-gradient(to_right,var(--light-line)_1px,transparent_0),linear-gradient(to_bottom,var(--light-line)_1px,transparent_0)] [background-repeat:repeat] [background-size:var(--cell-size)_var(--cell-size)] [height:300vh] [inset:0%_0px] [margin-left:-200%] [transform-origin:100%_0_0] [width:600vw] dark:[background-image:linear-gradient(to_right,var(--dark-line)_1px,transparent_0),linear-gradient(to_bottom,var(--dark-line)_1px,transparent_0)]" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent to-90% dark:from-black" />
    </div>
  );
};

// Premium Button Components
interface ShinyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const ShinyButton: React.FC<ShinyButtonProps> = ({ children, className, ...props }) => {
  return (
    <motion.button
      className={cn(
        "relative cursor-pointer rounded-lg px-6 py-2 font-medium backdrop-blur-xl border transition-shadow duration-300 ease-in-out hover:shadow dark:bg-[radial-gradient(circle_at_50%_0%,var(--primary)/10%_0%,transparent_60%)] dark:hover:shadow-[0_0_20px_var(--primary)/10%]",
        className,
      )}
      initial={{ "--x": "100%", scale: 0.8 }}
      animate={{ "--x": "-100%", scale: 1 }}
      whileTap={{ scale: 0.95 }}
      transition={{
        repeat: Infinity,
        repeatType: "loop",
        repeatDelay: 1,
        type: "spring",
        stiffness: 20,
        damping: 15,
        mass: 2,
        scale: {
          type: "spring",
          stiffness: 200,
          damping: 5,
          mass: 0.5,
        },
      }}
      {...props}
    >
      <span
        className="relative block size-full text-sm uppercase tracking-wide text-[rgb(0,0,0,65%)] dark:font-light dark:text-[rgb(255,255,255,90%)]"
        style={{
          maskImage:
            "linear-gradient(-75deg,var(--primary) calc(var(--x) + 20%),transparent calc(var(--x) + 30%),var(--primary) calc(var(--x) + 100%))",
        }}
      >
        {children}
      </span>
      <span
        style={{
          mask: "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
          WebkitMask:
            "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
          backgroundImage:
            "linear-gradient(-75deg,var(--primary)/10% calc(var(--x)+20%),var(--primary)/50% calc(var(--x)+25%),var(--primary)/10% calc(var(--x)+100%))",
        }}
        className="absolute inset-0 z-10 block rounded-[inherit] p-px"
      />
    </motion.button>
  );
};

// Store for the demo
interface ModernTenantFlowStore {
  theme: 'light' | 'dark';
  notifications: Array<{ id: string; title: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }>;
  metrics: {
    totalProperties: number;
    occupancyRate: number;
    monthlyRevenue: number;
    maintenanceRequests: number;
  };
  properties: Array<{
    id: string;
    name: string;
    address: string;
    units: number;
    occupiedUnits: number;
    revenue: number;
    imageUrl?: string;
  }>;
  setTheme: (theme: 'light' | 'dark') => void;
  addNotification: (notification: Omit<ModernTenantFlowStore['notifications'][0], 'id'>) => void;
  removeNotification: (id: string) => void;
  updateMetrics: (metrics: Partial<ModernTenantFlowStore['metrics']>) => void;
}

const useModernTenantFlowStore = create<ModernTenantFlowStore>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        theme: 'light',
        notifications: [
          {
            id: '1',
            title: 'New Tenant Application',
            message: 'Sarah Johnson applied for unit 402 at Sunset Gardens',
            type: 'info'
          },
          {
            id: '2',
            title: 'Maintenance Completed',
            message: 'Plumbing repair in unit 101 has been resolved',
            type: 'success'
          },
          {
            id: '3',
            title: 'Payment Overdue',
            message: 'Rent payment for unit 205 is 3 days overdue',
            type: 'warning'
          }
        ],
        metrics: {
          totalProperties: 8,
          occupancyRate: 92,
          monthlyRevenue: 48500,
          maintenanceRequests: 12
        },
        properties: [
          {
            id: '1',
            name: 'Sunset Gardens Apartments',
            address: '123 Main Street, San Francisco',
            units: 24,
            occupiedUnits: 22,
            revenue: 28800,
            imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop'
          },
          {
            id: '2',
            name: 'Downtown Luxury Lofts',
            address: '456 Oak Avenue, San Francisco',
            units: 16,
            occupiedUnits: 15,
            revenue: 32000,
            imageUrl: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=400&h=300&fit=crop'
          },
          {
            id: '3',
            name: 'Riverside Family Homes',
            address: '789 Pine Street, Palo Alto',
            units: 8,
            occupiedUnits: 7,
            revenue: 21600,
            imageUrl: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=300&fit=crop'
          }
        ],
        setTheme: (theme) => set({ theme }),
        addNotification: (notification) => set((state) => ({
          notifications: [...state.notifications, { ...notification, id: Math.random().toString(36).slice(2) }]
        })),
        removeNotification: (id) => set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        })),
        updateMetrics: (metrics) => set((state) => ({
          metrics: { ...state.metrics, ...metrics }
        }))
      })),
      {
        name: 'modern-tenant-flow-store'
      }
    )
  )
);

const meta: Meta = {
  title: 'TenantFlow/Modernized/Premium Showcase',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
        This showcase demonstrates how Magic UI premium components can modernize and enhance 
        the TenantFlow property management application. It combines the existing architecture 
        with premium visual effects, animations, and interactions.

        **Features Demonstrated:**
        - Warp Background effects for premium cards
        - Ripple animations for hero sections  
        - RetroGrid backgrounds for dashboards
        - Shiny button interactions
        - Advanced animation patterns
        - Modern state management with Zustand
        - Premium color schemes and gradients
        `,
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const ModernizedDashboard: Story = {
  render: () => {
    const { metrics, properties, notifications, theme, setTheme } = useModernTenantFlowStore();

    return (
      <div className="min-h-screen bg-background">
        {/* Hero Section with Ripple Effect */}
        <section className="relative py-20 px-6 text-center overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 text-white">
          <div className="relative z-10 max-w-6xl mx-auto space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                TenantFlow Premium
              </h1>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
                Experience next-generation property management with AI-powered automation, 
                premium visual effects, and seamless tenant communication.
              </p>
              <div className="flex gap-4 justify-center items-center">
                <ShinyButton className="px-8 py-4 text-lg">
                  Explore Premium Features
                </ShinyButton>
                <Button variant="outline" size="lg" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  Watch Demo
                </Button>
              </div>
            </motion.div>
          </div>
          <Ripple mainCircleSize={300} mainCircleOpacity={0.15} numCircles={6} />
        </section>

        {/* Dashboard Metrics with RetroGrid Background */}
        <section className="relative py-16 px-6 overflow-hidden">
          <RetroGrid className="opacity-30" />
          <div className="relative z-10 max-w-6xl mx-auto">
            <motion.h2 
              className="text-4xl font-bold text-center mb-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Portfolio Overview
            </motion.h2>
            
            <div className="grid md:grid-cols-4 gap-6 mb-12">
              {[
                { label: 'Properties', value: metrics.totalProperties, icon: '🏢', color: 'from-blue-500 to-blue-600' },
                { label: 'Occupancy Rate', value: `${metrics.occupancyRate}%`, icon: '📊', color: 'from-green-500 to-green-600' },
                { label: 'Monthly Revenue', value: `$${metrics.monthlyRevenue.toLocaleString()}`, icon: '💰', color: 'from-purple-500 to-purple-600' },
                { label: 'Active Requests', value: metrics.maintenanceRequests, icon: '🔧', color: 'from-orange-500 to-orange-600' }
              ].map((metric, index) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 cursor-pointer">
                    <div className={`absolute inset-0 bg-gradient-to-br ${metric.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                    <CardContent className="p-6 text-center relative">
                      <div className="text-3xl mb-2">{metric.icon}</div>
                      <div className="text-3xl font-bold mb-1 text-foreground">{metric.value}</div>
                      <p className="text-muted-foreground">{metric.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Premium Property Cards with Warp Background */}
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.h2 
              className="text-4xl font-bold text-center mb-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Premium Properties
            </motion.h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {properties.map((property, index) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="group"
                >
                  <WarpBackground 
                    className="p-0 overflow-hidden hover:shadow-2xl transition-all duration-500"
                    beamsPerSide={2}
                    beamSize={8}
                    perspective={150}
                  >
                    <Card className="border-0 bg-transparent backdrop-blur-sm">
                      {property.imageUrl && (
                        <div className="relative overflow-hidden">
                          <motion.img
                            src={property.imageUrl}
                            alt={property.name}
                            className="w-full h-48 object-cover"
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.3 }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        </div>
                      )}
                      <CardContent className="p-6">
                        <CardTitle className="mb-2 text-lg">{property.name}</CardTitle>
                        <CardDescription className="mb-4">{property.address}</CardDescription>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Units</span>
                            <Badge variant="outline">
                              {property.occupiedUnits}/{property.units}
                            </Badge>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Occupancy</span>
                            <Badge 
                              variant={property.occupiedUnits / property.units > 0.9 ? "default" : "secondary"}
                              className="bg-green-100 text-green-800"
                            >
                              {Math.round((property.occupiedUnits / property.units) * 100)}%
                            </Badge>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Revenue</span>
                            <span className="font-semibold text-green-600">
                              ${property.revenue.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-6 flex gap-2">
                          <ShinyButton className="flex-1">
                            View Details
                          </ShinyButton>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </WarpBackground>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Notifications Section with Premium Styling */}
        <section className="py-16 px-6 bg-muted/20">
          <div className="max-w-6xl mx-auto">
            <motion.h2 
              className="text-4xl font-bold text-center mb-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Recent Activity
            </motion.h2>
            
            <div className="space-y-4 max-w-2xl mx-auto">
              {notifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="group"
                >
                  <Card className="hover:shadow-lg transition-all duration-300 group-hover:scale-[1.02]">
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className={cn(
                        "w-3 h-3 rounded-full flex-shrink-0 mt-2",
                        notification.type === 'info' && "bg-blue-500",
                        notification.type === 'success' && "bg-green-500", 
                        notification.type === 'warning' && "bg-yellow-500",
                        notification.type === 'error' && "bg-red-500"
                      )} />
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{notification.title}</h4>
                        <p className="text-muted-foreground text-sm">{notification.message}</p>
                      </div>
                      <Badge variant={notification.type === 'warning' ? 'destructive' : 'secondary'}>
                        {notification.type}
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action with Premium Effects */}
        <section className="relative py-20 px-6 text-center overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
          <div className="relative z-10 max-w-4xl mx-auto space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                Ready to Upgrade?
              </h2>
              <p className="text-xl text-purple-100 mb-8">
                Transform your property management with premium features and stunning visual effects
              </p>
              <div className="flex gap-4 justify-center">
                <ShinyButton className="px-10 py-4 text-lg">
                  Start Premium Trial
                </ShinyButton>
                <Button variant="outline" size="lg" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  Contact Sales
                </Button>
              </div>
            </motion.div>
          </div>
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.3),transparent)] animate-pulse" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(232,121,249,0.3),transparent)] animate-pulse delay-1000" />
          </div>
        </section>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: `
        The **Modernized Dashboard** showcases a complete transformation of the TenantFlow interface 
        using Magic UI premium components and effects:

        ### Premium Components Used:
        - **WarpBackground**: 3D warp effects for property cards with animated beams
        - **Ripple**: Animated ripple effects in hero sections
        - **RetroGrid**: Futuristic grid backgrounds for dashboard sections
        - **ShinyButton**: Premium buttons with shimmer animations
        - **Motion**: Framer Motion for smooth page transitions and micro-interactions

        ### Enhanced Features:
        - **Premium color gradients** and visual hierarchy
        - **Advanced animations** with staggered timings
        - **Interactive hover effects** on cards and buttons
        - **Responsive design** with mobile-first approach
        - **Modern typography** and spacing
        - **Professional visual polish** throughout

        ### State Management:
        - Uses Zustand for reactive state updates
        - Real-time metrics and notifications
        - Persistent theme and user preferences

        This demonstrates how existing TenantFlow components can be elevated to a premium experience 
        while maintaining functionality and usability.
        `,
      },
    },
  },
};

export const PropertyCardShowcase: Story = {
  render: () => {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Property Card Evolution
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              See how Magic UI transforms standard property cards into premium, interactive experiences
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Original Style Card */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Original TenantFlow Card</h3>
              <Card className="w-full">
                <img 
                  src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=200&fit=crop" 
                  alt="Property" 
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                <CardContent className="p-6">
                  <CardTitle className="mb-2">Sunset Gardens Apartments</CardTitle>
                  <CardDescription className="mb-4">123 Main Street, San Francisco</CardDescription>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span>Units:</span>
                      <span>22/24</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Occupancy:</span>
                      <span>92%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Revenue:</span>
                      <span>$28,800</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1">View</Button>
                    <Button size="sm" variant="outline">Edit</Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Premium Magic UI Enhanced Card */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Magic UI Enhanced Card</h3>
              <motion.div
                whileHover={{ y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <WarpBackground 
                  className="p-0 overflow-hidden"
                  beamsPerSide={3}
                  beamSize={6}
                  perspective={120}
                >
                  <Card className="border-0 bg-transparent backdrop-blur-sm hover:shadow-2xl transition-all duration-500">
                    <div className="relative overflow-hidden">
                      <motion.img
                        src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=200&fit=crop"
                        alt="Property"
                        className="w-full h-48 object-cover"
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.4 }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                      <div className="absolute top-4 right-4">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className="bg-white/20 backdrop-blur-sm rounded-full p-2"
                        >
                          ⭐
                        </motion.div>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <CardTitle className="mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          Sunset Gardens Apartments
                        </CardTitle>
                        <CardDescription className="mb-4 flex items-center gap-2">
                          📍 123 Main Street, San Francisco
                        </CardDescription>
                      </motion.div>
                      
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                          <span className="text-sm font-medium">Units</span>
                          <Badge variant="outline" className="bg-white/50">
                            22/24
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                          <span className="text-sm font-medium">Occupancy</span>
                          <Badge className="bg-green-500 hover:bg-green-600">
                            92% 📈
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg">
                          <span className="text-sm font-medium">Revenue</span>
                          <span className="font-bold text-green-600 text-lg">
                            $28,800 💰
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <ShinyButton className="flex-1 text-sm">
                          View Details ✨
                        </ShinyButton>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button variant="outline" size="sm" className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 hover:shadow-md">
                            Edit 📝
                          </Button>
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </WarpBackground>
              </motion.div>
            </div>
          </div>

          {/* Comparison Summary */}
          <div className="mt-12 p-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
            <h3 className="text-2xl font-bold mb-6 text-center">Enhancement Summary</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold mb-3 text-red-600">❌ Original Limitations</h4>
                <ul className="space-y-2 text-sm">
                  <li>• Static design with no animations</li>
                  <li>• Basic hover states only</li>
                  <li>• Standard card appearance</li>
                  <li>• Limited visual hierarchy</li>
                  <li>• No premium visual effects</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-green-600">✅ Magic UI Enhancements</h4>
                <ul className="space-y-2 text-sm">
                  <li>• WarpBackground with 3D beam effects</li>
                  <li>• Framer Motion hover animations</li>
                  <li>• Gradient backgrounds and premium colors</li>
                  <li>• Interactive micro-animations</li>
                  <li>• Professional visual polish</li>
                  <li>• Enhanced accessibility and UX</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: `
        This story demonstrates the dramatic transformation possible when applying Magic UI 
        components to existing TenantFlow elements. The side-by-side comparison shows:

        ### Visual Enhancements:
        - **WarpBackground effects** creating depth and premium feel
        - **Motion animations** for smoother interactions  
        - **Gradient styling** for modern visual appeal
        - **Enhanced typography** and spacing
        - **Interactive feedback** on all touchpoints

        ### UX Improvements:
        - Better visual hierarchy with colors and spacing
        - Improved accessibility with larger touch targets
        - Enhanced feedback through animations
        - Professional visual polish throughout
        - Modern design patterns and conventions

        This showcases how existing components can be elevated without losing functionality.
        `,
      },
    },
  },
};

export const ButtonEvolution: Story = {
  render: () => {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Button Evolution Showcase
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From standard UI buttons to premium Magic UI interactive components
            </p>
          </div>

          {/* Standard Buttons */}
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold">Standard TenantFlow Buttons</h2>
            <div className="flex flex-wrap gap-4 p-6 bg-muted/20 rounded-lg">
              <Button>Default Button</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large Button</Button>
            </div>
          </section>

          {/* Magic UI Premium Buttons */}
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold">Magic UI Premium Buttons</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* Shiny Button Demo */}
              <div className="space-y-4 p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                <h3 className="font-medium">Shiny Button</h3>
                <p className="text-sm text-muted-foreground">Premium shimmer effect with smooth animations</p>
                <div className="space-y-3">
                  <ShinyButton>Premium Action</ShinyButton>
                  <ShinyButton className="bg-gradient-to-r from-purple-600 to-blue-600">
                    Gradient Shiny
                  </ShinyButton>
                </div>
              </div>

              {/* Motion Enhanced Button */}
              <div className="space-y-4 p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                <h3 className="font-medium">Motion Enhanced</h3>
                <p className="text-sm text-muted-foreground">Framer Motion with scale and hover effects</p>
                <div className="space-y-3">
                  <motion.div
                    whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Button className="bg-gradient-to-r from-green-500 to-emerald-500 w-full">
                      Hover & Tap Me
                    </Button>
                  </motion.div>
                  
                  <motion.div
                    whileHover={{ 
                      scale: 1.02,
                      backgroundPosition: "200% center",
                    }}
                    transition={{ duration: 0.3 }}
                    className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-400 bg-[length:200%_auto] rounded-md"
                  >
                    <Button variant="ghost" className="w-full text-white hover:bg-transparent">
                      Animated Background
                    </Button>
                  </motion.div>
                </div>
              </div>

              {/* Interactive Feedback */}
              <div className="space-y-4 p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg">
                <h3 className="font-medium">Interactive Feedback</h3>
                <p className="text-sm text-muted-foreground">Rich visual feedback with state changes</p>
                <div className="space-y-3">
                  <motion.div
                    whileHover={{ rotateX: 5, rotateY: 5 }}
                    whileTap={{ rotateX: -5, rotateY: -5 }}
                    style={{ perspective: 1000 }}
                  >
                    <Button className="bg-gradient-to-r from-orange-500 to-red-500 w-full relative overflow-hidden">
                      <motion.div
                        className="absolute inset-0 bg-white/20"
                        initial={{ x: "-100%" }}
                        whileHover={{ x: "100%" }}
                        transition={{ duration: 0.5 }}
                      />
                      <span className="relative z-10">3D Transform</span>
                    </Button>
                  </motion.div>
                  
                  <Button 
                    className="w-full bg-gradient-to-r from-red-400 to-orange-400 hover:from-red-500 hover:to-orange-500 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/25"
                    onClick={() => {
                      // Add click feedback
                    }}
                  >
                    Click for Effect
                  </Button>
                </div>
              </div>

              {/* Loading & State Buttons */}
              <div className="space-y-4 p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                <h3 className="font-medium">Loading States</h3>
                <p className="text-sm text-muted-foreground">Animated loading and state transitions</p>
                <div className="space-y-3">
                  <Button disabled className="w-full relative">
                    <motion.div
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    Processing...
                  </Button>
                  
                  <motion.div
                    animate={{
                      background: [
                        "linear-gradient(90deg, #8b5cf6 0%, #ec4899 100%)",
                        "linear-gradient(90deg, #ec4899 0%, #f59e0b 100%)",
                        "linear-gradient(90deg, #f59e0b 0%, #8b5cf6 100%)",
                      ]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="rounded-md"
                  >
                    <Button className="w-full bg-transparent hover:bg-transparent text-white">
                      Animated Gradient
                    </Button>
                  </motion.div>
                </div>
              </div>

              {/* Micro Interaction Buttons */}
              <div className="space-y-4 p-6 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-lg">
                <h3 className="font-medium">Micro Interactions</h3>
                <p className="text-sm text-muted-foreground">Subtle animations that delight users</p>
                <div className="space-y-3">
                  <motion.div whileHover="hover" className="relative">
                    <motion.div
                      variants={{
                        hover: { scale: 1.02 }
                      }}
                    >
                      <Button className="bg-gradient-to-r from-teal-500 to-cyan-500 w-full relative overflow-hidden">
                        <motion.span
                          variants={{
                            hover: { x: 2 }
                          }}
                          className="flex items-center gap-2"
                        >
                          Hover for Motion
                          <motion.span
                            variants={{
                              hover: { x: 4 }
                            }}
                          >
                            →
                          </motion.span>
                        </motion.span>
                      </Button>
                    </motion.div>
                  </motion.div>
                  
                  <Button 
                    className="w-full bg-gradient-to-r from-cyan-400 to-teal-400 relative group"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ripple = document.createElement('div');
                      ripple.className = 'absolute bg-white/20 rounded-full pointer-events-none animate-ping';
                      ripple.style.width = ripple.style.height = '10px';
                      ripple.style.left = Math.random() * rect.width + 'px';
                      ripple.style.top = Math.random() * rect.height + 'px';
                      e.currentTarget.appendChild(ripple);
                      setTimeout(() => ripple.remove(), 1000);
                    }}
                  >
                    Interactive Sparkles ✨
                  </Button>
                </div>
              </div>

              {/* Success & Feedback States */}
              <div className="space-y-4 p-6 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg">
                <h3 className="font-medium">Success States</h3>
                <p className="text-sm text-muted-foreground">Visual feedback for successful actions</p>
                <div className="space-y-3">
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    onTap={() => {
                      // Simulate success animation
                    }}
                  >
                    <Button 
                      className="bg-gradient-to-r from-emerald-500 to-green-500 w-full hover:from-emerald-600 hover:to-green-600 transition-all duration-300"
                    >
                      <motion.span
                        initial={{ opacity: 1 }}
                        className="flex items-center gap-2"
                      >
                        Save Changes
                        <motion.span
                          animate={{ 
                            rotate: [0, 360],
                            scale: [1, 1.2, 1]
                          }}
                          transition={{ 
                            duration: 2,
                            repeat: Infinity,
                            repeatDelay: 3
                          }}
                        >
                          💾
                        </motion.span>
                      </motion.span>
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </section>

          {/* Implementation Benefits */}
          <section className="mt-16 p-8 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-pink-900/10 rounded-xl">
            <h2 className="text-2xl font-bold mb-6 text-center">Magic UI Button Benefits</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className="text-2xl mb-2">🎨</div>
                <h3 className="font-semibold">Visual Excellence</h3>
                <p className="text-sm text-muted-foreground">
                  Premium gradients, shadows, and visual effects that create professional appeal
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="text-2xl mb-2">⚡</div>
                <h3 className="font-semibold">Performance Optimized</h3>
                <p className="text-sm text-muted-foreground">
                  Smooth 60fps animations using Framer Motion and CSS transforms
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="text-2xl mb-2">🚀</div>
                <h3 className="font-semibold">User Engagement</h3>
                <p className="text-sm text-muted-foreground">
                  Interactive feedback and micro-animations that delight users
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: `
        This comprehensive showcase demonstrates how Magic UI transforms standard buttons into 
        premium interactive components:

        ### Key Enhancements:
        - **Shiny Button**: Premium shimmer effects with configurable animations
        - **Motion Enhanced**: Framer Motion integration for smooth interactions
        - **Interactive Feedback**: Rich visual feedback with state changes
        - **Loading States**: Animated loading and transition effects
        - **Micro Interactions**: Subtle animations that enhance UX
        - **Success States**: Visual feedback for completed actions

        ### Technical Features:
        - 60fps animations using CSS transforms and Framer Motion
        - Configurable colors, gradients, and timing
        - Accessibility-compliant interactions
        - Mobile-responsive touch interactions
        - Performance-optimized with minimal bundle impact

        ### Implementation Benefits:
        - Increased user engagement through delightful interactions
        - Professional visual polish that enhances brand perception
        - Improved usability with clear visual feedback
        - Modern design standards that meet user expectations

        These enhanced buttons can be dropped into existing TenantFlow interfaces to immediately 
        elevate the user experience while maintaining all existing functionality.
        `,
      },
    },
  },
};