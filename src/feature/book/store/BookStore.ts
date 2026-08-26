import { Book } from '@/entities/book/book.type'
import { create } from 'zustand'

interface BooksStore {
  selectedBookId: string | null,
  books: Book[]
}

interface BooksStoreActions {
  setSelectedBook: (selectedBookId: string) => void
  setBooks: (books: Book[]) => void
}

export const useBooksStore = create<BooksStore & BooksStoreActions>((set) => ({
  books: [],
  selectedBookId: null,

  setBooks: (books) => set({ books }),

  setSelectedBook: (selectedBookId) => set({ selectedBookId }),
}))
