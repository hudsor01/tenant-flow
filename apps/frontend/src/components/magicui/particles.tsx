"use client";

import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

interface ParticlesProps extends ComponentPropsWithoutRef<"div"> {
  className?: string;
  quantity?: number;
  staticity?: number;
  ease?: number;
  size?: number;
  color?: string;
  refresh?: boolean;
}

function ParticlesComponent({ 
  className, 
  quantity: _quantity, 
  staticity: _staticity, 
  ease: _ease, 
  size: _size,
  color: _color, 
  refresh: _refresh, 
  ...props 
}: ParticlesProps) {
  // Minimal placeholder to satisfy types; replace with animated particles if needed.
  // Note: Custom props (quantity, staticity, ease, size, color, refresh) are not passed to DOM
  return <div className={cn(className)} {...props} />
}

// Named export for story compatibility
export const Particles = ParticlesComponent;
export default ParticlesComponent;
