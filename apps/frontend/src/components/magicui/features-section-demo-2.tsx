import { 
  cn,
  containerClasses,
  gridClasses,
  cardClasses,
  TYPOGRAPHY_SCALE,
  ANIMATION_DURATIONS
} from "@/lib/design-system";
import type { ComponentSize } from '@repo/shared';
import {
  Settings,
  Cloud,
  DollarSign,
  Zap,
  Heart,
  HelpCircle,
  ArrowLeft,
  Terminal,
} from "lucide-react";

interface FeaturesSectionDemoProps {
  variant?: 'default' | 'modern' | 'minimal';
  size?: ComponentSize;
  className?: string;
}

export default function FeaturesSectionDemo({ 
  variant = 'default',
  size = 'default',
  className
}: FeaturesSectionDemoProps = {}) {
  const features = [
    {
      title: "Built for developers",
      description:
        "Built for engineers, developers, dreamers, thinkers and doers.",
      icon: <Terminal />,
    },
    {
      title: "Ease of use",
      description:
        "It's as easy as using an Apple, and as expensive as buying one.",
      icon: <Zap />,
    },
    {
      title: "Pricing like no other",
      description:
        "Our prices are best in the market. No cap, no lock, no credit card required.",
      icon: <DollarSign />,
    },
    {
      title: "100% Uptime guarantee",
      description: "We just cannot be taken down by anyone.",
      icon: <Cloud />,
    },
    {
      title: "Multi-tenant Architecture",
      description: "You can simply share passwords instead of buying new seats",
      icon: <ArrowLeft />,
    },
    {
      title: "24/7 Customer Support",
      description:
        "We are available a 100% of the time. Atleast our AI Agents are.",
      icon: <HelpCircle />,
    },
    {
      title: "Money back guarantee",
      description:
        "If you donot like EveryAI, we will convince you to like us.",
      icon: <Settings />,
    },
    {
      title: "And everything else",
      description: "I just ran out of copy ideas. Accept my sincere apologies",
      icon: <Heart />,
    },
  ];

  const variants = {
    default: "section-content",
    modern: "section-content",
    minimal: "compact-padding"
  };

  return (
    <div className={cn(
      containerClasses('2xl'),
      gridClasses({ 
        default: 1, 
        md: 2, 
        lg: 4 
      }),
      "relative z-10",
      variants[variant],
      className
    )}>
      {features.map((feature, index) => (
        <Feature 
          key={feature.title} 
          {...feature} 
          index={index} 
          variant={variant}
          size={size}
        />
      ))}
    </div>
  );
}

interface FeatureProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
  variant?: 'default' | 'modern' | 'minimal';
  size?: ComponentSize;
}

const Feature = ({
  title,
  description,
  icon,
  index,
  variant = 'default',
  size = 'default'
}: FeatureProps) => {
  // Design system integrated typography
  const titleStyles = {
    xs: TYPOGRAPHY_SCALE['body-md'],
    sm: TYPOGRAPHY_SCALE['heading-sm'],
    default: TYPOGRAPHY_SCALE['heading-md'],
    lg: TYPOGRAPHY_SCALE['heading-lg'],
    xl: TYPOGRAPHY_SCALE['heading-xl']
  };

  const descriptionStyles = {
    xs: TYPOGRAPHY_SCALE['body-xs'],
    sm: TYPOGRAPHY_SCALE['body-sm'],
    default: TYPOGRAPHY_SCALE['body-sm'],
    lg: TYPOGRAPHY_SCALE['body-md'],
    xl: TYPOGRAPHY_SCALE['body-lg']
  };

  // Enhanced variant configurations
  const variantClasses = {
    default: {
      container: cn(
        cardClasses('default'),
        "flex flex-col lg:border-r py-10 relative group/feature border-border/30 hover:border-border/50 hover:bg-accent/5"
      ),
      gradient: "bg-gradient-to-t from-accent/10 dark:from-accent/5 to-transparent",
      gradientBottom: "bg-gradient-to-b from-accent/10 dark:from-accent/5 to-transparent",
      icon: "text-muted-foreground group-hover/feature:text-primary",
      accent: "bg-muted group-hover/feature:bg-primary",
      title: "text-foreground"
    },
    modern: {
      container: cn(
        cardClasses('elevated'),
        "flex flex-col card-padding relative group/feature rounded-xl border border-border/20 hover:border-primary/30 hover:shadow-lg bg-card/50 backdrop-blur-sm"
      ),
      gradient: "bg-gradient-to-t from-primary/5 to-transparent",
      gradientBottom: "bg-gradient-to-b from-primary/5 to-transparent", 
      icon: "text-primary/70 group-hover/feature:text-primary",
      accent: "bg-primary/20 group-hover/feature:bg-primary group-hover/feature:shadow-lg",
      title: "text-card-foreground"
    },
    minimal: {
      container: cn(
        cardClasses('interactive'),
        "flex flex-col p-6 relative group/feature hover:bg-muted/30"
      ),
      gradient: "bg-gradient-to-t from-muted/20 to-transparent",
      gradientBottom: "bg-gradient-to-b from-muted/20 to-transparent",
      icon: "text-muted-foreground group-hover/feature:text-foreground",
      accent: "bg-border group-hover/feature:bg-foreground/20",
      title: "text-foreground"
    }
  };

  const currentVariant = variantClasses[variant];

  // Responsive padding based on size
  const paddingClasses = {
    xs: "px-4",
    sm: "px-6", 
    default: "px-8",
    lg: "px-10",
    xl: "px-12"
  };

  return (
    <div
      className={cn(
        currentVariant.container,
        // Enhanced accessibility
        "focus-within:ring-2 focus-within:ring-primary/20 focus-within:ring-offset-2",
        // Grid positioning for default variant
        variant === 'default' && [
          (index === 0 || index === 4) && "lg:border-l border-border/30",
          index < 4 && "lg:border-b border-border/30"
        ]
      )}
      style={{
        transition: `all ${ANIMATION_DURATIONS.default} cubic-bezier(0.4, 0, 0.2, 1)`
      }}
    >
      {/* Enhanced gradient overlays */}
      {index < 4 && (
        <div 
          className={cn(
            "opacity-0 group-hover/feature:opacity-100 absolute inset-0 h-full w-full pointer-events-none",
            currentVariant.gradient
          )}
          style={{
            transition: `opacity ${ANIMATION_DURATIONS.default} ease-out`
          }}
        />
      )}
      {index >= 4 && (
        <div 
          className={cn(
            "opacity-0 group-hover/feature:opacity-100 absolute inset-0 h-full w-full pointer-events-none",
            currentVariant.gradientBottom
          )}
          style={{
            transition: `opacity ${ANIMATION_DURATIONS.default} ease-out`
          }}
        />
      )}

      {/* Icon with enhanced styling */}
      <div className={cn(
        "mb-6 relative z-10",
        paddingClasses[size],
        currentVariant.icon,
        "w-fit p-3 rounded-xl bg-accent/10 group-hover/feature:bg-primary/10 group-hover/feature:scale-110"
      )}
      style={{
        transition: `all ${ANIMATION_DURATIONS.medium} cubic-bezier(0.4, 0, 0.2, 1)`
      }}
      >
        <div className="w-6 h-6">
          {icon}
        </div>
      </div>

      {/* Title with enhanced typography and animation */}
      <div className={cn(
        "mb-3 relative z-10",
        paddingClasses[size]
      )}>
        {variant === 'default' && (
          <div 
            className={cn(
              "absolute left-0 inset-y-0 w-1 rounded-tr-full rounded-br-full",
              "h-6 group-hover/feature:h-8",
              currentVariant.accent,
              "transition-all origin-center"
            )}
            style={{
              transitionDuration: ANIMATION_DURATIONS.default
            }}
          />
        )}
        <h3 
          className={cn(
            "font-semibold tracking-tight",
            variant === 'default' && "group-hover/feature:translate-x-2 transition-transform",
            currentVariant.title
          )}
          style={{
            ...titleStyles[size],
            transition: `transform ${ANIMATION_DURATIONS.default} ease-out`
          }}
        >
          {title}
        </h3>
      </div>

      {/* Description with design system typography */}
      <p 
        className={cn(
          "text-muted-foreground max-w-xs relative z-10 leading-relaxed",
          paddingClasses[size]
        )}
        style={descriptionStyles[size]}
      >
        {description}
      </p>
    </div>
  );
};
