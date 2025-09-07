"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface SparklesProps {
  className?: string;
  size?: number;
  minSize?: number;
  density?: number;
  speed?: number;
  opacity?: number;
  color?: string;
  children?: React.ReactNode;
}

export function Sparkles({
  className,
  size = 1.2,
  minSize = 0.4,
  density = 800,
  speed: _speed = 1.2,
  opacity = 1,
  color = "#FFC107",
  children,
}: SparklesProps) {
  const sparkles = Array.from({ length: Math.floor(density / 100) }, (_, i) => (
    <motion.div
      key={i}
      className="absolute rounded-full"
      style={{
        background: color,
        width: Math.random() * (size - minSize) + minSize + "rem",
        height: Math.random() * (size - minSize) + minSize + "rem",
        top: Math.random() * 100 + "%",
        left: Math.random() * 100 + "%",
        opacity: opacity * (0.3 + Math.random() * 0.7),
      }}
      animate={{
        scale: [0, 1, 0],
        rotate: [0, 180, 360],
        opacity: [0, opacity, 0],
      }}
      transition={{
        duration: Math.random() * 2 + 1,
        repeat: Infinity,
        delay: Math.random() * 2,
        ease: "easeInOut",
      }}
    />
  ));

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="absolute inset-0 pointer-events-none">
        {sparkles}
      </div>
      {children}
    </div>
  );
}