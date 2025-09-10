"use client";

import type { ComponentPropsWithoutRef} from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import { 
  cn, 
  ANIMATION_DURATIONS,
  TYPOGRAPHY_SCALE
} from "@/lib/design-system";

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number;
  startValue?: number;
  direction?: "up" | "down";
  delay?: number;
  decimalPlaces?: number;
  size?: 'display-2xl' | 'display-xl' | 'display-lg' | 'heading-xl' | 'heading-lg' | 'heading-md' | 'heading-sm' | 'body-lg' | 'body-md' | 'body-sm' | 'body-xs';
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  animationDuration?: number;
}

export function NumberTicker({
  value,
  startValue = 0,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  size = 'body-md',
  variant = 'default',
  animationDuration = 1000,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [currentValue, setCurrentValue] = useState(direction === "down" ? value : startValue);
  const [isInView, setIsInView] = useState(false);

  // Variant configurations
  const variants = {
    default: 'text-foreground',
    primary: 'text-primary font-semibold',
    success: 'text-green-600 dark:text-green-400 font-semibold',
    warning: 'text-orange-600 dark:text-orange-400 font-semibold',
    danger: 'text-red-600 dark:text-red-400 font-semibold',
  }

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Simple intersection observer implementation
  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Animate the number when in view
  useEffect(() => {
    if (!isInView) return;

    const timer = setTimeout(() => {
      const targetValue = direction === "down" ? startValue : value;
      const startVal = direction === "down" ? value : startValue;
      const duration = 1000; // 1 second animation
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = startVal + (targetValue - startVal) * easeOut;
        
        setCurrentValue(current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      animate();
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [isInView, value, startValue, direction, delay]);

  const formatNumber = useCallback((num: number) => {
    return Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(Number(num.toFixed(decimalPlaces)));
  }, [decimalPlaces]);

  // Prevent hydration mismatch by showing initial value on server
  if (!isMounted) {
    return (
      <span
        className={cn("inline-block tabular-nums tracking-wider", className)}
        {...props}
      >
        {formatNumber(startValue)}
      </span>
    );
  }

  return (
    <span
      ref={ref}
      className={cn("inline-block tabular-nums tracking-wider", className)}
      {...props}
    >
      {formatNumber(currentValue)}
    </span>
  );
}
