import type { ReactNode } from "react"
import { create } from "zustand"

export type SidebarMode = "icon" | "none"

interface LayoutStore {
  // Slots
  header: ReactNode
  footer: ReactNode

  prevHeader: ReactNode
  prevFooter: ReactNode

  // Visibility
  sidebarVisible: boolean
  headerVisible: boolean
  footerVisible: boolean

  // Sidebar
  sidebarMode: SidebarMode

  // Slots actions
  setHeader: (header: ReactNode) => void
  setFooter: (footer: ReactNode) => void

  setPrevHeader: () => void
  setPrevFooter: () => void

  clearHeader: () => void
  clearFooter: () => void

  // Visibility actions
  setSidebarVisible: (visible: boolean) => void
  setHeaderVisible: (visible: boolean) => void
  setFooterVisible: (visible: boolean) => void

  // Toggle actions
  toggleSidebar: () => void
  toggleHeader: () => void
  toggleFooter: () => void

  // Sidebar actions
  setSidebarMode: (mode: SidebarMode) => void

  // Utils
  resetLayout: () => void
}

const initialState = {
  header: null,
  footer: null,

  prevHeader: null,
  prevFooter: null,

  sidebarVisible: true,
  headerVisible: true,
  footerVisible: true,

  sidebarMode: "icon" as SidebarMode,
}

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  ...initialState,

  setHeader: (header) => set({ header, prevHeader: get().header }),
  setFooter: (footer) => set({ footer, prevHeader: get().footer }),

  setPrevHeader: () => {
    set({header: get().prevHeader})
  },
  setPrevFooter: () => {
    set({header: get().prevFooter})
  },

  clearHeader: () => set({ header: null }),
  clearFooter: () => set({ footer: null }),

  setSidebarVisible: (visible) => set({ sidebarVisible: visible }),
  setHeaderVisible: (visible) => set({ headerVisible: visible }),
  setFooterVisible: (visible) => set({ footerVisible: visible }),

  toggleSidebar: () =>
    set((state) => ({
      sidebarVisible: !state.sidebarVisible,
    })),

  toggleHeader: () =>
    set((state) => ({
      headerVisible: !state.headerVisible,
    })),

  toggleFooter: () =>
    set((state) => ({
      footerVisible: !state.footerVisible,
    })),

  setSidebarMode: (mode) =>
    set({
      sidebarMode: mode,
    }),

  resetLayout: () =>
    set({
      ...initialState,
    }),
}))
