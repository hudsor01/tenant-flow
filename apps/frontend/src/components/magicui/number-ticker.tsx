"use client";

import type { ComponentPropsWithoutRef} from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  cn,
  TYPOGRAPHY_SCALE
} from "@/lib/utils";
import type { TypographyVariant } from '@repo/shared';

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number;
  startValue?: number;
  direction?: "up" | "down";
  delay?: number;
  decimalPlaces?: number;
  size?: TypographyVariant;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';
  animationDuration?: number;
  prefix?: string;
  suffix?: string;
  enableIntersectionObserver?: boolean;
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
  prefix = '',
  suffix = '',
  enableIntersectionObserver = true,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [currentValue, setCurrentValue] = useState(direction === "down" ? value : startValue);
  const [isInView, setIsInView] = useState(!enableIntersectionObserver);

  // Enhanced variant configurations with design system integration
  const variants = {
    default: 'text-foreground',
    primary: 'text-primary font-semibold',
    success: 'text-green-600 dark:text-green-400 font-semibold',
    warning: 'text-orange-600 dark:text-orange-400 font-semibold',
    danger: 'text-red-600 dark:text-red-400 font-semibold',
    muted: 'text-muted-foreground'
  }

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Enhanced intersection observer implementation
  useEffect(() => {
    if (!ref.current || !enableIntersectionObserver) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [enableIntersectionObserver]);

  // Enhanced animation with configurable duration and easing
  useEffect(() => {
    if (!isInView) return;

    const timer = setTimeout(() => {
      const targetValue = direction === "down" ? startValue : value;
      const startVal = direction === "down" ? value : startValue;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);
        
        // Enhanced easing function (ease-out cubic)
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const current = startVal + (targetValue - startVal) * easeOutCubic;
        
        setCurrentValue(current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      animate();
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [isInView, value, startValue, direction, delay, animationDuration]);

  const formatNumber = useCallback((num: number) => {
    return Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(Number(num.toFixed(decimalPlaces)));
  }, [decimalPlaces]);

  // Get typography styles from design system
  const typographyStyle = TYPOGRAPHY_SCALE[size as keyof typeof TYPOGRAPHY_SCALE] || TYPOGRAPHY_SCALE['body-md'];

  // Enhanced number formatting with prefix/suffix support
  const formatDisplayValue = useCallback((num: number) => {
    return `${prefix}${formatNumber(num)}${suffix}`;
  }, [prefix, suffix, formatNumber]);

  // Prevent hydration mismatch by showing initial value on server
  if (!isMounted) {
    return (
      <span
        className={cn("inline-block tabular-nums tracking-wider font-mono",
          variants[variant],
          className
        )}
        style={typographyStyle}
        {...props}
      >
        {formatDisplayValue(startValue)}
      </span>
    );
  }

  return (
    <span
      ref={ref}
      className={cn("inline-block tabular-nums tracking-wider font-mono transition-all",
        variants[variant],
        className
      )}
      style={typographyStyle}
      {...props}
    >
      {formatDisplayValue(currentValue)}
    </span>
  );
}
