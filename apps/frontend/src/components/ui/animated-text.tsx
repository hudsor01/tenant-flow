"use client";

import React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

// Animated Gradient Text
interface AnimatedGradientTextProps extends HTMLMotionProps<"h1"> {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedGradientText({
  children,
  className,
  ...props
}: AnimatedGradientTextProps) {
  const variants = {
    initial: { backgroundPosition: "200% 0%" },
    animate: { backgroundPosition: "-200% 0%" },
  };

  return (
    <motion.h1
      initial="initial"
      animate="animate"
      transition={{
        duration: 8,
        ease: "linear",
        repeat: Infinity,
      }}
      variants={variants}
      className={cn(
        "inline-block bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-[length:300%_100%] bg-clip-text font-bold text-transparent",
        className
      )}
      {...props}
    >
      {children}
    </motion.h1>
  );
}

// Shiny Text with Masked Gradient Effect
interface ShinyTextProps extends HTMLMotionProps<"span"> {
  children: React.ReactNode;
  className?: string;
  shimmerWidth?: number;
}

export function ShinyText({
  children,
  className,
  shimmerWidth = 100,
  ...props
}: ShinyTextProps) {
  return (
    <motion.span
      initial={{ "--shimmer-x": "-100%" }}
      animate={{ "--shimmer-x": "200%" }}
      transition={{
        duration: 3,
        ease: "linear",
        repeat: Infinity,
        repeatDelay: 1,
      }}
      className={cn(
        "relative inline-block bg-gradient-to-r from-slate-900 via-slate-100 to-slate-900 bg-clip-text text-transparent",
        // Shimmer effect mask
        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
        "before:[mask:linear-gradient(90deg,transparent,black,transparent)] before:[mask-size:200px_100%]",
        "before:animate-shimmer",
        className
      )}
      style={{
        "--shimmer-x": "var(--shimmer-x)",
        maskImage: `linear-gradient(90deg, transparent, black calc(var(--shimmer-x) - ${shimmerWidth}px), black calc(var(--shimmer-x) + ${shimmerWidth}px), transparent)`,
      } as React.CSSProperties}
      {...props}
    >
      {children}
    </motion.span>
  );
}

// Typing Animation
interface TypingAnimationProps {
  text: string;
  duration?: number;
  className?: string;
}

export function TypingAnimation({
  text,
  duration = 200,
  className,
}: TypingAnimationProps) {
  const [displayedText, setDisplayedText] = React.useState("");
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, duration);

      return () => clearTimeout(timeout);
    }
    return undefined; // Satisfy TypeScript - not all code paths return a value
  }, [currentIndex, duration, text]);

  return (
    <span className={cn("inline-block", className)}>
      {displayedText}
      <span className="animate-pulse">|</span>
    </span>
  );
}

// Morphing Text
interface MorphingTextProps {
  texts: string[];
  duration?: number;
  className?: string;
}

export function MorphingText({ 
  texts, 
  duration = 3000, 
  className 
}: MorphingTextProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    if (texts.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % texts.length);
    }, duration);

    return () => clearInterval(interval);
  }, [texts.length, duration]);

  return (
    <motion.span
      key={currentIndex}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className={cn("inline-block", className)}
    >
      {texts[currentIndex]}
    </motion.span>
  );
}

// Word Rotate
interface WordRotateProps {
  words: string[];
  duration?: number;
  className?: string;
}

export function WordRotate({
  words,
  duration = 2500,
  className,
}: WordRotateProps) {
  const [currentWord, setCurrentWord] = React.useState(words[0] || "");
  const [isAnimating, setIsAnimating] = React.useState(false);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentWord((prev) => {
          const currentIndex = words.indexOf(prev);
          const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % words.length;
          return words[nextIndex] || "";
        });
        setIsAnimating(false);
      }, 250);
    }, duration);

    return () => clearInterval(interval);
  }, [words, duration]);

  return (
    <div className={cn("overflow-hidden", className)}>
      <motion.div
        animate={{
          y: isAnimating ? -40 : 0,
          opacity: isAnimating ? 0 : 1,
        }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="inline-block"
      >
        {currentWord}
      </motion.div>
    </div>
  );
}

// Blur Fade Animation
interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  variant?: {
    hidden: { y?: number; opacity?: number; filter?: string };
    visible: { y?: number; opacity?: number; filter?: string };
  };
  duration?: number;
  delay?: number;
  yOffset?: number;
  inView?: boolean;
  _inViewMargin?: string;
  blur?: string;
}

export function BlurFade({
  children,
  className,
  variant,
  duration = 0.4,
  delay = 0,
  yOffset = 6,
  inView = false,
  _inViewMargin = "-50px",
  blur = "6px",
}: BlurFadeProps) {
  const defaultVariants = {
    hidden: { y: yOffset, opacity: 0, filter: `blur(${blur})` },
    visible: { y: -yOffset, opacity: 1, filter: `blur(0px)` },
  };
  const combinedVariants = variant || defaultVariants;

  return (
    <motion.div
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      exit="hidden"
      variants={combinedVariants}
      transition={{
        delay: 0.04 + delay,
        duration,
        ease: "easeOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}