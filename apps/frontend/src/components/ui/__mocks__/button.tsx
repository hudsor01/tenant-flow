/**
 * Mock Button Component for Testing
 */

import React from 'react'

export const Button = ({ 
  children, 
  onClick, 
  disabled, 
  type = 'button',
  className,
  variant,
  size,
  ...props 
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
  variant?: string
  size?: string
  [key: string]: unknown
}) => (
  <button 
    onClick={onClick} 
    disabled={disabled} 
    type={type}
    className={className}
    data-variant={variant}
    data-size={size}
    {...props}
  >
    {children}
  </button>
)

export default Button