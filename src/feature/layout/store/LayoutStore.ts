import type { ReactNode } from "react"
import { create } from "zustand"

export type SidebarMode = "icon" | "hide" | "full"

interface LayoutStore {
  // Slots
  header: ReactNode
  footer: ReactNode
  rightSidebar: ReactNode

  prevHeader: ReactNode
  prevFooter: ReactNode

  sidebarMode: SidebarMode
  headerVisible: boolean
  footerVisible: boolean
  rightSidebarVisible: boolean

  // Slots actions
  setHeader: (header: ReactNode) => void
  setFooter: (footer: ReactNode) => void
  setRightSidebar: (rightSidebar: ReactNode) => void

  setPrevHeader: () => void
  setPrevFooter: () => void

  clearHeader: () => void
  clearFooter: () => void

  // Visibility actions
  setSidebarMode: (mode: SidebarMode) => void
  showRightSidebar: () => void
  hideRightSidebar: () => void
  setHeaderVisible: (visible: boolean) => void
  setFooterVisible: (visible: boolean) => void

  toggleHeader: () => void
  toggleFooter: () => void

  resetLayout: () => void
}

const initialState = {
  header: null,
  footer: null,
  rightSidebar: null,

  prevHeader: null,
  prevFooter: null,

  headerVisible: true,
  footerVisible: false,
  rightSidebarVisible: false,

  sidebarMode: "full" as SidebarMode,
}

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  ...initialState,

  setHeader: (header) =>
    set((state) => ({ header, prevHeader: state.header })),
  setFooter: (footer) =>
    set((state) => ({ footer, prevFooter: state.footer })),
  setRightSidebar: (rightSidebar) =>
    set({ rightSidebar }),

  setPrevHeader: () => {
    set({ header: get().prevHeader })
  },
  setPrevFooter: () => {
    set({ footer: get().prevFooter })
  },

  clearHeader: () => set({ header: null }),
  clearFooter: () => set({ footer: null }),

  setHeaderVisible: (visible) => set({ headerVisible: visible }),
  setFooterVisible: (visible) => set({ footerVisible: visible }),
  showRightSidebar: () => set({ rightSidebarVisible: true }),
  hideRightSidebar: () => set({ rightSidebarVisible: false }),

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
