import type { Book } from "@/entities/book/book.type";
import type { LibraryVariant } from "../store/LibraryStore";
import { BookGrid } from "./BookGrid";
import { BookList } from "./BookList";

type BookCollectionProps = {
  books: Book[];
  selectedBookId: string | null;
  variant: LibraryVariant;
  onBookClick: (bookId: string) => void;
};

export function BookCollection({ books, selectedBookId, variant, onBookClick }: BookCollectionProps) {
  if (variant === "grid") {
    return <BookGrid books={books} selectedBookId={selectedBookId} onClick={onBookClick} />;
  }

  return <BookList books={books} selectedBookId={selectedBookId} onClick={onBookClick} />;
}
