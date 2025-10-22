"use client"

import { ComponentPropsWithoutRef, RefObject, useEffect, useRef, useState } from "react"
import { useSpring, animated } from "@react-spring/web"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"
import { cn } from "@/lib/utils"

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number
  startValue?: number
  direction?: "up" | "down"
  delay?: number
  decimalPlaces?: number
}

export function NumberTicker({
  value,
  startValue = 0,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [hasAnimated, setHasAnimated] = useState(false)
  const { isIntersecting } = useIntersectionObserver(ref as RefObject<Element>, {
    threshold: 0.1,
    rootMargin: "0px",
  })

  const from = direction === "down" ? value : startValue
  const to = direction === "down" ? startValue : value

  const { number } = useSpring({
    from: { number: from },
    to: { number: hasAnimated ? to : from },
    delay: delay * 1000,
    config: {
      tension: 100,
      friction: 60,
      precision: 0.01
    },
  })

  useEffect(() => {
    if (isIntersecting && !hasAnimated) {
      queueMicrotask(() => setHasAnimated(true))
    }
  }, [isIntersecting, hasAnimated])

  return (
    <animated.span
      ref={ref}
      className={cn(
        "inline-block tabular-nums tracking-wider",
        className
      )}
      {...props}
    >
      {number.to((n) =>
        Intl.NumberFormat("en-US", {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        }).format(n)
      )}
    </animated.span>
  )
}

export default NumberTicker