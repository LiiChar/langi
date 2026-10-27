import { BookCollection } from "../components/BookCollection"
import { useLibrary } from "../hooks/useLibrary"
import { useNavigate } from "@tanstack/react-router"
import { useBooksStore } from "@/feature/book/store/BookStore"
import { useLibraryStore } from "../store/LibraryStore"

export const LibraryPage = () => {
  const { page, variant } = useLibraryStore()
  const setSelectedBookId = useBooksStore((state) => state.setSelectedBook);
  const books = useLibrary()
  const navigate = useNavigate();

  const selected = books[page]?.id;

  const handleBookClick = (bookId: string) => {
    console.log(bookId)
    setSelectedBookId(bookId);
    navigate({ to: `/book/${bookId}/read`});
  }

  return (
    <div className="window p-2">
      <BookCollection variant={variant} selectedBookId={selected} books={books} onBookClick={handleBookClick} />
    </div>
  )
}
