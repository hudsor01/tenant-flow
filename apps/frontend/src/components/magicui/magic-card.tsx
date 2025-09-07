"use client";

import { cn } from "@/lib/utils";
import React, { useCallback, useState } from "react";

interface MousePosition {
  x: number;
  y: number;
}

interface MagicCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  gradientColor?: string;
  gradientOpacity?: number;
}

export const MagicCard = React.forwardRef<HTMLDivElement, MagicCardProps>(
  ({
    children,
    className,
    gradientColor = "hsl(var(--ring))",
    gradientOpacity = 0.4,
    ...props
  }, ref) => {
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

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
        "group relative overflow-hidden rounded-xl bg-card p-4",
        className,
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <div className="relative z-10">{children}</div>
      <div
        className={cn(
          "pointer-events-none absolute -inset-px opacity-0 transition duration-300",
          isHovered ? "opacity-100" : "opacity-0",
        )}
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, ${gradientColor}${Math.round(gradientOpacity * 255).toString(16).padStart(2, '0')}, transparent 40%)`,
        }}
      />
    </div>
  );
})
MagicCard.displayName = 'MagicCard'
