import { BookGrid } from "../components/BookGrid"
import { BookList } from "../components/BookList"
import { useLibraryStore } from "../store/LibraryStore"
import { useLibrary } from "../hooks/useLibrary"
import { useNavigate } from "@tanstack/react-router"
import { useBooksStore } from "@/feature/book/store/BookStore"

export const LibraryPage = () => {
  const { page, viewMode, variant } = useLibraryStore()
  const setSelectedBookId = useBooksStore((state) => state.setSelectedBook);
  const books = useLibrary()

  const navigate = useNavigate();

  const selected = books[page]?.id;

  const handleBookClick = (bookId: string) => {
    console.log(bookId)
    setSelectedBookId(bookId);
    navigate({ to: `/book/${bookId}`});
  }

  return (
    <div className="p-2">
      {
        variant == "grid"
        ? <BookGrid selectedBookId={selected} books={books} onClick={handleBookClick} />
        : <BookList selectedBookId={selected} books={books} onClick={handleBookClick} />
      }
    </div>
  )
}
