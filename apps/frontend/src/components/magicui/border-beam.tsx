"use client";

import { cn } from "@/lib/utils";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  anchor?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export const BorderBeam = ({
  className,
  size = 200,
  duration = 15,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  delay = 0,
}: BorderBeamProps) => {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] [border:calc(var(--border-width)*1px)_solid_transparent]",

        // mask styles
        "[background:linear-gradient(var(--angle),transparent_20%,var(--color-from)_50%,var(--color-to)_70%,transparent_80%)_border-box]",
        "[mask:linear-gradient(#fff_0_0)_padding-box,_linear-gradient(#fff_0_0)]",
        "[mask-composite:xor]",

        // pseudo styles
        "before:absolute before:aspect-square before:w-full before:rotate-0 before:animate-border-beam before:[background:conic-gradient(from_calc(270deg-(var(--angle)*0.5)),transparent_0deg,var(--color-from)_calc(var(--angle)*1deg),var(--color-to)_calc(var(--angle)*2deg),transparent_calc(var(--angle)*3deg))] before:[mask:radial-gradient(calc(var(--size)*1px)_at_50%_calc(0px-calc(var(--border-width)*1px)),_#0000_99%,_#000_100%)] before:absolute before:inset-0 before:h-full before:w-full before:opacity-100",

        className
      )}
      style={
        {
          "--size": size,
          "--duration": `${duration}s`,
          "--anchor": `${anchor}deg`,
          "--border-width": borderWidth,
          "--color-from": colorFrom,
          "--color-to": colorTo,
          "--delay": `-${delay}s`,
        } as React.CSSProperties
      }
    />
  );
};