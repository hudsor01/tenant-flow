"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface GlowingEffectProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  glowSize?: string;
  glowOpacity?: number;
}

export function GlowingEffect({
  children,
  className,
  glowColor = "hsl(var(--primary))",
  glowSize: _glowSize = "20px",
  glowOpacity = 0.4,
}: GlowingEffectProps) {
  return (
    <div className={cn("relative", className)}>
      <div
        className="absolute inset-0 rounded-[inherit] blur-xl"
        style={{
          background: glowColor,
          opacity: glowOpacity,
          transform: `scale(1.1)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}