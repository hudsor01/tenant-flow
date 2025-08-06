/**
 * PropertyCard Component Tests
 * Tests for property display and interaction functionality
 */

import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderComponent, createPropertyCardProps, expectSuccessMessage } from '@/test/component-test-helpers'
import { PropertyCard } from '@/components/properties/PropertyCard'

describe('PropertyCard Component', () => {
  const defaultProps = createPropertyCardProps()

  it('renders property information correctly', () => {
    renderComponent(<PropertyCard {...defaultProps} />)
    
    expect(screen.getByText(defaultProps.property.name)).toBeInTheDocument()
    expect(screen.getByText(defaultProps.property.address)).toBeInTheDocument()
    expect(screen.getByText(`$${defaultProps.property.rent_amount}`)).toBeInTheDocument()
    expect(screen.getByText(`${defaultProps.property.bedrooms} bed`)).toBeInTheDocument()
    expect(screen.getByText(`${defaultProps.property.bathrooms} bath`)).toBeInTheDocument()
  })

  it('displays property status correctly', () => {
    const props = createPropertyCardProps({
      property: { status: 'available' }
    })
    
    renderComponent(<PropertyCard {...props} />)
    expect(screen.getByText('Available')).toBeInTheDocument()
  })

  it('handles edit action', async () => {
    const { user } = renderComponent(<PropertyCard {...defaultProps} />)
    
    const editButton = screen.getByRole('button', { name: /edit/i })
    await user.click(editButton)
    
    expect(defaultProps.onEdit).toHaveBeenCalledWith(defaultProps.property)
  })

  it('handles delete action with confirmation', async () => {
    const { user } = renderComponent(<PropertyCard {...defaultProps} />)
    
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    await user.click(deleteButton)
    
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    await user.click(confirmButton)
    
    expect(defaultProps.onDelete).toHaveBeenCalledWith(defaultProps.property.id)
  })

  it('displays property image when available', () => {
    const props = createPropertyCardProps({
      property: { imageUrl: 'https://example.com/property.jpg' }
    })
    
    renderComponent(<PropertyCard {...props} />)
    
    const image = screen.getByRole('img', { name: /property image/i })
    expect(image).toHaveAttribute('src', 'https://example.com/property.jpg')
  })

  it('shows fallback when no image available', () => {
    renderComponent(<PropertyCard {...defaultProps} />)
    
    expect(screen.getByTestId('property-placeholder')).toBeInTheDocument()
  })

  it('is accessible with proper ARIA labels', () => {
    renderComponent(<PropertyCard {...defaultProps} />)
    
    const card = screen.getByRole('article')
    expect(card).toHaveAttribute('aria-label', expect.stringContaining(defaultProps.property.name))
  })
})