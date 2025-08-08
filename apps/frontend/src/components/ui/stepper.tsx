"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Step {
  id: string
  title: string
  description?: string
  completed?: boolean
  current?: boolean
}

interface StepperProps {
  steps: Step[]
  currentStep?: number
  orientation?: "horizontal" | "vertical"
  className?: string
}

export function Stepper({
  steps,
  currentStep = 0,
  orientation = "horizontal",
  className,
}: StepperProps) {
  return (
    <div
      className={cn(
        "flex",
        orientation === "vertical" ? "flex-col" : "flex-row items-center",
        className
      )}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isLast = index === steps.length - 1

        return (
          <React.Fragment key={step.id}>
            <div
              className={cn(
                "flex",
                orientation === "vertical" ? "flex-row gap-4" : "flex-col items-center"
              )}
            >
              {/* Step indicator */}
              <div className="relative flex items-center justify-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                    isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCurrent
                      ? "border-primary bg-background text-primary"
                      : "border-muted-foreground/30 bg-background text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
              </div>

              {/* Step content */}
              <div
                className={cn(
                  "flex flex-col",
                  orientation === "horizontal" ? "mt-2 text-center" : "flex-1"
                )}
              >
                <h3
                  className={cn(
                    "text-sm font-medium",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </h3>
                {step.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {step.description}
                  </p>
                )}
              </div>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  "flex-1",
                  orientation === "horizontal"
                    ? "mx-4 h-[2px] min-w-[2rem]"
                    : "my-4 ml-5 w-[2px] min-h-[2rem]",
                  isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// Wizard-specific stepper with navigation
interface WizardStepperProps extends StepperProps {
  onStepClick?: (stepIndex: number) => void
  allowStepClick?: boolean
}

export function WizardStepper({
  steps,
  currentStep = 0,
  orientation = "horizontal",
  onStepClick,
  allowStepClick = false,
  className,
}: WizardStepperProps) {
  return (
    <div
      className={cn(
        "flex",
        orientation === "vertical" ? "flex-col" : "flex-row items-center",
        className
      )}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isLast = index === steps.length - 1
        const isClickable = allowStepClick && (isCompleted || isCurrent)

        return (
          <React.Fragment key={step.id}>
            <div
              className={cn(
                "flex",
                orientation === "vertical" ? "flex-row gap-4" : "flex-col items-center",
                isClickable && "cursor-pointer"
              )}
              onClick={() => isClickable && onStepClick?.(index)}
            >
              {/* Step indicator */}
              <div className="relative flex items-center justify-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                    isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCurrent
                      ? "border-primary bg-background text-primary shadow-lg shadow-primary/25"
                      : "border-muted-foreground/30 bg-background text-muted-foreground",
                    isClickable && "hover:scale-110"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
              </div>

              {/* Step content */}
              <div
                className={cn(
                  "flex flex-col",
                  orientation === "horizontal" ? "mt-2 text-center" : "flex-1"
                )}
              >
                <h3
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isCurrent ? "text-foreground" : "text-muted-foreground",
                    isClickable && "hover:text-foreground"
                  )}
                >
                  {step.title}
                </h3>
                {step.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {step.description}
                  </p>
                )}
              </div>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  "flex-1 transition-colors",
                  orientation === "horizontal"
                    ? "mx-4 h-[2px] min-w-[2rem]"
                    : "my-4 ml-5 w-[2px] min-h-[2rem]",
                  isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}