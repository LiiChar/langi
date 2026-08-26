import { ReactElement } from "react"
import { create } from "zustand"

interface LayoutStore {
  header: ReactElement | null
  footer: ReactElement | null

  sidebarVisible: boolean
  sidebarCollapsible: "icon" | "none"
  headerVisible: boolean
  footerVisible: boolean

  setHeader: (header: ReactElement | null) => void
  setFooter: (footer: ReactElement | null) => void
  setSidebarVisible: (visible: boolean) => void
  setSidebarCollapsible: (sidebarCollapsible: "icon" | "none") => void
  setHeaderVisible: (visible: boolean) => void
  setFooterVisible: (visible: boolean) => void
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  header: null,
  footer: null,

  sidebarVisible: true,
  sidebarCollapsible: "icon",
  headerVisible: true,
  footerVisible: true,

  setHeader: (header: ReactElement | null) => set({ header }),
  setFooter: (footer: ReactElement | null) => set({ footer }),
  setSidebarVisible: (visible: boolean) => set({ sidebarVisible: visible }),
  setSidebarCollapsible: (sidebarCollapsible: "icon" | "none") => set({ sidebarCollapsible }),
  setHeaderVisible: (visible: boolean) => set({ headerVisible: visible }),
  setFooterVisible: (visible: boolean) => set({ footerVisible: visible }),
}))
