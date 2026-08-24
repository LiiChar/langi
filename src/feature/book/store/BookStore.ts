import { Book } from '@/entities/book/book.type'
import { create } from 'zustand'
import { combine } from 'zustand/middleware'

interface BookStore {
  books: Book[]
}

export const useBookStore = create<BookStore>((set) => ({
  books: []
}))
