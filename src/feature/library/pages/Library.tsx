import { useBookStore } from "@/feature/book/store/BookStore"
import { BookGrid } from "../components/BookGrid"
import { BookList } from "../components/BookList"
import { useLibraryStore } from "../store/LibraryStore"

export const LibraryPage = () => {
  const { page, render, variant } = useLibraryStore()
  const {books} = useBookStore()

  return (
    <div>
      {variant == "grid" ? <BookGrid books={books} /> : <BookList books={books} />}
    </div>
  )
}
