import { create } from "zustand"

export type LibraryVariant = "list" | "grid"
export type LibraryViewMode = "pagination" | "infinity"

interface LibraryStore {
  search: string | null
  caseSensitive: boolean
  sortMode: "title" | "recent"
  page: number

  variant: LibraryVariant
  viewMode: LibraryViewMode

  setPage: (page: number) => void
  setVariant: (variant: LibraryVariant) => void
  setViewMode: (viewMode: LibraryViewMode) => void
  setSearch: (search: string) => void
  setCaseSensitive: (value: boolean) => void
  setSortMode: (value: "title" | "recent") => void
}

export const useLibraryStore = create<LibraryStore>((set) => ({
  search: null,
  caseSensitive: false,
  sortMode: "recent",
  page: 0,

  variant: "list",
  viewMode: "infinity",

  setPage: (page) => set({ page }),
  setVariant: (variant) => set({ variant }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSearch: (search) => set({ search }),
  setCaseSensitive: (caseSensitive) => set({ caseSensitive }),
  setSortMode: (sortMode) => set({ sortMode }),
}))
