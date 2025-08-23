/**
 * Mock Card Components for Testing
 */

import React from 'react'

export const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: unknown }) => (
  <div className={className} data-testid="card" {...props}>
    {children}
  </div>
)

export const CardContent = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: unknown }) => (
  <div className={className} data-testid="card-content" {...props}>
    {children}
  </div>
)

export const CardDescription = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: unknown }) => (
  <p className={className} data-testid="card-description" {...props}>
    {children}
  </p>
)

export const CardFooter = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: unknown }) => (
  <div className={className} data-testid="card-footer" {...props}>
    {children}
  </div>
)

export const CardHeader = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: unknown }) => (
  <div className={className} data-testid="card-header" {...props}>
    {children}
  </div>
)

export const CardTitle = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: unknown }) => (
  <h3 className={className} data-testid="card-title" {...props}>
    {children}
  </h3>
)