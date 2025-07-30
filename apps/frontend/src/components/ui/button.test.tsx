import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './button'

describe('Button Component', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('should apply variant classes', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-destructive')
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should apply size classes', () => {
    render(<Button size="lg">Large Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-11')
  })

  it('should handle click events', () => {
    const mockClick = vi.fn()
    render(<Button onClick={mockClick}>Click me</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(mockClick).toHaveBeenCalledOnce()
  })

  it('should not trigger click when disabled', () => {
    const mockClick = vi.fn()
    render(<Button onClick={mockClick} disabled>Click me</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(mockClick).not.toHaveBeenCalled()
  })

  it('should render as different HTML elements with asChild', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )
    
    expect(screen.getByRole('link')).toBeInTheDocument()
    expect(screen.getByText('Link Button')).toBeInTheDocument()
  })

  it('should apply all variant combinations', () => {
    const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const
    const sizes = ['default', 'sm', 'lg', 'icon'] as const
    
    variants.forEach(variant => {
      sizes.forEach(size => {
        const { unmount } = render(
          <Button variant={variant} size={size}>
            {variant}-{size}
          </Button>
        )
        
        const button = screen.getByRole('button')
        expect(button).toBeInTheDocument()
        
        // Clean up for next iteration
        unmount()
      })
    })
  })
})