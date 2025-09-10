"use client";

import { 
  cn, 
  cardClasses,
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
  variant?: 'default' | 'elevated' | 'bordered' | 'glass';
  size?: 'sm' | 'md' | 'lg';
}

export const MagicCard = React.forwardRef<HTMLDivElement, MagicCardProps>(
  ({
    children,
    className,
    gradientColor = "hsl(var(--primary))",
    gradientOpacity = 0.4,
    variant = 'default',
    size = 'md',
    ...props
  }, ref) => {
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Modern SaaS variant configurations with enhanced styling
  const variants = {
    default: "bg-card/50 border border-border/60 shadow-sm backdrop-blur-sm",
    elevated: "bg-card border border-border/80 shadow-lg hover:shadow-xl transition-shadow duration-200",
    bordered: "bg-card border-2 border-primary/15 shadow-sm hover:border-primary/25 transition-colors duration-200",
    glass: "bg-card/40 backdrop-blur-xl border border-border/40 shadow-lg"
  }

  // Enhanced size configurations with modern spacing
  const sizes = {
    sm: "p-4 rounded-xl",
    md: "p-6 rounded-2xl", 
    lg: "p-8 rounded-3xl"
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
        "transition-all duration-200 ease-out",
        // Subtle hover transform for modern feel
        "hover:scale-[1.01] active:scale-[0.99]",
        // Enhanced focus states for accessibility
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
        variants[variant],
        sizes[size],
        className,
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <div className="relative z-10">{children}</div>
      
      {/* Magic gradient overlay */}
      <div
        className={cn(
          "pointer-events-none absolute -inset-px opacity-0",
          `transition-opacity duration-[${ANIMATION_DURATIONS.default}ms] ease-out`,
          isHovered ? "opacity-100" : "opacity-0",
        )}
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, ${gradientColor}${Math.round(gradientOpacity * 255).toString(16).padStart(2, '0')}, transparent 40%)`,
        }}
      />
      
      {/* Enhanced border effect */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-0",
          `transition-opacity duration-[${ANIMATION_DURATIONS.fast}ms] ease-out`,
          isHovered ? "opacity-100" : "opacity-0",
          "border border-primary/20 rounded-[inherit]"
        )}
      />
    </div>
  );
})
MagicCard.displayName = 'MagicCard'
