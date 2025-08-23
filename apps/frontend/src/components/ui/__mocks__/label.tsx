/**
 * Mock Label Component for Testing
 */

import React from 'react'

export const Label = ({ 
  children, 
  className,
  htmlFor,
  ...props 
}: {
  children: React.ReactNode
  className?: string
  htmlFor?: string
  [key: string]: unknown
}) => (
  <label 
    className={className}
    htmlFor={htmlFor}
    data-testid="label"
    {...props}
  >
    {children}
  </label>
)