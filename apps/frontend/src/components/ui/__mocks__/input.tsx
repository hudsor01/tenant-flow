/**
 * Mock Input Components for Testing
 */

import React from 'react'

export const Input = ({ 
  type = 'text',
  className,
  value,
  onChange,
  placeholder,
  disabled,
  required,
  ...props 
}: {
  type?: string
  className?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  [key: string]: unknown
}) => (
  <input
    type={type}
    className={className}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    required={required}
    data-testid="input"
    {...props}
  />
)

export const PasswordInput = ({ 
  className,
  value,
  onChange,
  placeholder,
  disabled,
  required,
  ...props 
}: {
  className?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  [key: string]: unknown
}) => (
  <div data-testid="password-input">
    <input
      type="password"
      className={className}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      {...props}
    />
  </div>
)