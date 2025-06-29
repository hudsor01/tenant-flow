import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { Button } from './button'

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-primary')
  })

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button', { name: 'Secondary' })).toHaveClass('bg-secondary')

    rerender(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole('button', { name: 'Outline' })).toHaveClass('border', 'bg-background')

    rerender(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button', { name: 'Ghost' })).toHaveClass('hover:bg-accent')

    rerender(<Button variant="destructive">Destructive</Button>)
    expect(screen.getByRole('button', { name: 'Destructive' })).toHaveClass('bg-destructive')
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button', { name: 'Small' })).toHaveClass('h-8')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button', { name: 'Large' })).toHaveClass('h-10')

    rerender(<Button size="icon">Icon</Button>)
    expect(screen.getByRole('button', { name: 'Icon' })).toHaveClass('h-9', 'w-9')
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('disabled:pointer-events-none')
  })

  it('forwards ref correctly', () => {
    const ref = vi.fn()
    render(<Button ref={ref}>Button</Button>)
    expect(ref).toHaveBeenCalled()
  })

  it('accepts custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })

  it('spreads additional props', () => {
    render(<Button data-testid="custom-button" aria-label="Custom button">Button</Button>)
    const button = screen.getByTestId('custom-button')
    expect(button).toHaveAttribute('aria-label', 'Custom button')
  })
})