"use client";

import { 
  cn,
  ANIMATION_DURATIONS 
} from "@/lib/design-system";
import React, { useCallback, useState } from "react";

interface MousePosition {
  x: number;
  y: number;
}

interface MagicCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  gradientColor?: string;
  gradientOpacity?: number;
  variant?: 'default' | 'elevated' | 'bordered' | 'glass' | 'premium';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  glowIntensity?: 'subtle' | 'medium' | 'strong';
}

export const MagicCard = React.forwardRef<HTMLDivElement, MagicCardProps>(
  ({
    children,
    className,
    gradientColor = "hsl(var(--primary))",
    gradientOpacity = 0.4,
    variant = 'default',
    size = 'md',
    interactive = true,
    glowIntensity = 'medium',
    ...props
  }, ref) => {
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Enhanced variant configurations with design system integration
  const variants = {
    default: "bg-card/50 border border-border/60 shadow-sm backdrop-blur-sm",
    elevated: "bg-card border border-border/80 shadow-lg hover:shadow-xl transition-shadow duration-200",
    bordered: "bg-card border-2 border-primary/15 shadow-sm hover:border-primary/25 transition-colors duration-200",
    glass: "bg-card/40 backdrop-blur-xl border border-border/40 shadow-lg",
    premium: "bg-gradient-to-br from-card via-card/95 to-card/90 border border-primary/20 shadow-xl backdrop-blur-sm"
  }

  // Expanded size configurations with better spacing scale
  const sizes = {
    sm: "p-4 rounded-xl",
    md: "p-6 rounded-2xl", 
    lg: "card-padding rounded-3xl",
    xl: "p-10 rounded-[2rem]"
  }

  // Glow intensity configurations
  const glowIntensities = {
    subtle: 0.2,
    medium: 0.4,
    strong: 0.6
  }

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        // Base styles with modern SaaS aesthetics
        "group relative overflow-hidden will-change-transform",
        `transition-all duration-[${ANIMATION_DURATIONS.default}] ease-out`,
        // Conditional interactive transforms
        interactive && [
          "hover:scale-[1.01] active:scale-[0.99]",
          "cursor-pointer"
        ],
        // Enhanced focus states for accessibility
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
        // ARIA support
        "focus-within:ring-2 focus-within:ring-primary/20",
        variants[variant],
        sizes[size],
        className,
      )}
      onMouseMove={interactive ? handleMouseMove : undefined}
      onMouseEnter={interactive ? handleMouseEnter : undefined}
      onMouseLeave={interactive ? handleMouseLeave : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      {...props}
    >
      <div className="relative z-10">{children}</div>
      
      {/* Enhanced magic gradient overlay with intensity control */}
      {interactive && (
        <div
          className={cn(
            "pointer-events-none absolute -inset-px opacity-0",
            `transition-opacity duration-[${ANIMATION_DURATIONS.default}ms] ease-out`,
            isHovered ? "opacity-100" : "opacity-0",
          )}
          style={{
            background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, ${gradientColor}${Math.round((gradientOpacity * glowIntensities[glowIntensity]) * 255).toString(16).padStart(2, '0')}, transparent 40%)`,
          }}
        />
      )}
      
      {/* Enhanced border effect with better accessibility */}
      {interactive && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 opacity-0",
            `transition-opacity duration-[${ANIMATION_DURATIONS.fast}ms] ease-out`,
            isHovered ? "opacity-100" : "opacity-0",
            "border border-primary/20 rounded-[inherit]"
          )}
          aria-hidden="true"
        />
      )}
    </div>
  );
})
MagicCard.displayName = 'MagicCard'
