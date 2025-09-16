"use client"

import { useSpring } from '@react-spring/web'

export function useCheckoutAnimations() {
  const [containerSpring, containerApi] = useSpring(() => ({
    opacity: 0,
    transform: 'translateY(20px)',
    config: { tension: 300, friction: 30 },
  }))

  const [errorSpring, errorApi] = useSpring(() => ({
    opacity: 0,
    scale: 0.95,
    config: { tension: 400, friction: 25 },
  }))

  const [successSpring, successApi] = useSpring(() => ({
    opacity: 0,
    scale: 0.9,
    rotate: -5,
    config: { tension: 300, friction: 20 },
  }))

  return { containerSpring, containerApi, errorSpring, errorApi, successSpring, successApi }
}

