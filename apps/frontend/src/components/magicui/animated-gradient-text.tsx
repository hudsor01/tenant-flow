import { 
  cn, 
  TYPOGRAPHY_SCALE
} from "@/lib/design-system";
import type { ComponentPropsWithoutRef } from "react";

export interface AnimatedGradientTextProps 
 extends ComponentPropsWithoutRef<"span"> {
 speed?: number;
 colorFrom?: string;
 colorTo?: string;
 variant?: 'primary' | 'accent' | 'rainbow' | 'sunset' | 'ocean';
 size?: 'display-2xl' | 'display-xl' | 'display-lg' | 'heading-xl' | 'heading-lg' | 'heading-md' | 'heading-sm' | 'body-lg' | 'body-md' | 'body-sm' | 'body-xs';
}

export function AnimatedGradientText({
 children,
 className,
 speed = 1,
 colorFrom,
 colorTo,
 variant = 'primary',
 size = 'body-md',
 ...props
}: AnimatedGradientTextProps) {
 // Modern SaaS gradient variants with subtle, professional colors
 const gradientVariants = {
   primary: {
     from: 'hsl(var(--primary))',
     to: 'hsl(var(--primary) / 0.8)',
     via: 'hsl(var(--accent))'
   },
   accent: {
     from: 'hsl(var(--accent))',
     to: 'hsl(var(--accent) / 0.7)',
     via: 'hsl(var(--primary))'
   },
   rainbow: {
     from: 'hsl(var(--primary))', // Primary
     to: 'hsl(var(--accent))', // Accent
     via: 'hsl(var(--primary) / 0.8)' // Primary variant
   },
   sunset: {
     from: 'hsl(var(--accent))', // Accent
     to: 'hsl(var(--destructive))', // Destructive for red
     via: 'hsl(var(--accent) / 0.8)' // Accent variant
   },
   ocean: {
     from: 'hsl(var(--primary))', // Primary blue
     to: 'hsl(var(--accent))', // Accent blue
     via: 'hsl(var(--primary) / 0.7)' // Primary variant
   }
 }

 const selectedGradient = gradientVariants[variant]
 const finalColorFrom = colorFrom || selectedGradient.from
 const finalColorTo = colorTo || selectedGradient.to

 return (
  <span
   className={cn(
    // Enhanced gradient animation with smoother transitions
    "inline animate-gradient bg-gradient-to-r from-[var(--color-from)] via-[var(--color-via)] to-[var(--color-to)] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent",
    // Modern typography and interactions
    "font-semibold tracking-tight antialiased",
    "transition-all duration-200 ease-out",
    "hover:scale-[1.02] active:scale-[0.98]",
    // Mobile-first responsive behavior
    "will-change-transform",
    className,
   )}
   style={{
    "--bg-size": `${speed * 200}%`, // Reduced multiplier for subtler effect
    "--color-from": finalColorFrom,
    "--color-to": finalColorTo,
    "--color-via": selectedGradient.via,
    animationDuration: `${2.5 / speed}s`, // Slightly faster animation
    fontSize: TYPOGRAPHY_SCALE[size].fontSize,
    lineHeight: TYPOGRAPHY_SCALE[size].lineHeight,
    letterSpacing: (TYPOGRAPHY_SCALE[size] as { letterSpacing?: string }).letterSpacing || '-0.025em', // Tighter letter spacing
    fontWeight: TYPOGRAPHY_SCALE[size].fontWeight,
   } as React.CSSProperties}
   {...props}
  >
   {children}
  </span>
 );
}
