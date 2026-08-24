import { create } from 'zustand'
import { combine } from 'zustand/middleware'

interface LibraryStore {
  page: number,
  variant: "list" | "grid",
  render: "pagination" | "infinity"
}

export const useLibraryStore = create<LibraryStore>((set) => ({
  page: 0,
  variant: "list",
  render: "infinity"
}))
