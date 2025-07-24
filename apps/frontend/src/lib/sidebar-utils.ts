import { createContext } from 'react'


export type SidebarState = 'expanded' | 'collapsed'

export interface SidebarContextProps {
  state: SidebarState
  open: boolean
  setOpen: (open: boolean) => void
  isMobile: boolean
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  toggleSidebar: () => void
}

export const SidebarContext = createContext<SidebarContextProps | undefined>(undefined)

export const getSidebarState = (): SidebarState => 'expanded'

export const toggleSidebar = (state: SidebarState): SidebarState => 
  state === 'expanded' ? 'collapsed' : 'expanded'

export const useSidebar = (): SidebarContextProps => {
  return {
    state: 'expanded',
    open: true,
    setOpen: () => {},
    isMobile: false,
    openMobile: false,
    setOpenMobile: () => {},
    toggleSidebar: () => {}
  }
}