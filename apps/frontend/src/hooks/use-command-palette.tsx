'use client'

/**
 * Command Palette Hook
 * Manages command palette state and actions
 */

import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { useAppStore } from '../stores/app-store'

interface RecentItem {
  id: string
  title: string
  description?: string
  href: string
  type?: string
  icon?: ReactNode
  timestamp: number
}

export function useCommandPalette() {
  const isOpen = useAppStore(state => state.modals.commandPalette || false)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  
  const openCommandPalette = useCallback(() => {
    useAppStore.getState().openModal('commandPalette')
  }, [])
  
  const closeCommandPalette = useCallback(() => {
    useAppStore.getState().closeModal('commandPalette')
  }, [])
  
  const toggleCommandPalette = useCallback(() => {
    if (isOpen) {
      closeCommandPalette()
    } else {
      openCommandPalette()
    }
  }, [isOpen, openCommandPalette, closeCommandPalette])

  const addRecentItem = useCallback((item: Omit<RecentItem, 'timestamp'>) => {
    const newItem: RecentItem = {
      ...item,
      timestamp: Date.now()
    }
    
    setRecentItems(prev => {
      // Remove if already exists and add to front
      const filtered = prev.filter(i => i.id !== item.id)
      const updated = [newItem, ...filtered].slice(0, 10) // Keep max 10 items
      
      // Persist to localStorage
      try {
        localStorage.setItem('command-palette-recent', JSON.stringify(updated))
      } catch (error) {
        console.warn('Failed to persist recent command palette items:', error)
      }
      
      return updated
    })
  }, [])

  return {
    isOpen,
    open: openCommandPalette,
    close: closeCommandPalette,
    toggle: toggleCommandPalette,
    recentItems,
    addRecentItem
  }
}

// Simple passthrough provider - command palette state is managed by Zustand
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}