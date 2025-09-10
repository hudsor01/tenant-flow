import { useSpring, animated } from "@react-spring/web"
import type React from "react"
import { useEffect, useState } from "react"

type TimelineContentProps<T extends keyof HTMLElementTagNameMap> = {
  children?: React.ReactNode
  animationNum: number
  className?: string
  timelineRef: React.RefObject<HTMLElement | null>
  as?: T
  once?: boolean
  customVariants?: Record<string, unknown>
} & React.ComponentProps<T>

export const TimelineContent = <T extends keyof HTMLElementTagNameMap = "div">({
  children,
  animationNum,
  timelineRef,
  className,
  as,
  once = false,
  customVariants: _customVariants,
  ...props
}: TimelineContentProps<T>) => {
  const [isInView, setIsInView] = useState(false)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true)
          if (once) {
            observer.disconnect()
          }
        } else if (!once) {
          setIsInView(false)
        }
      },
      { threshold: 0.1 }
    )

    if (timelineRef.current) {
      observer.observe(timelineRef.current)
    }

    return () => observer.disconnect()
  }, [timelineRef, once])

  const spring = useSpring({
    opacity: isInView ? 1 : 0,
    filter: isInView ? "blur(0px)" : "blur(20px)",
    transform: `translateY(${isInView ? 0 : 20}px)`,
    delay: animationNum * 500,
    config: { tension: 280, friction: 60 },
  })

  const _Component = as || "div"

  return (
    <animated.div
      style={spring}
      className={className}
      {...(props as React.HTMLAttributes<HTMLDivElement>)}
    >
      {children}
    </animated.div>
  )
}