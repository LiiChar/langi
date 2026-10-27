import { Book } from "@/entities/book/book.type"
import { BookGridItem } from "./BookGridItem"

export type BookGridType = {
  books: Book[];
  selectedBookId: string | null;
  onClick: (id: string) => void;
}

export const BookGrid = ({ books, selectedBookId, onClick }: BookGridType) => {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2">
      {books.map(b => (
        <BookGridItem key={b.id} book={ b } selected={ selectedBookId === b.id} onHandleClick={onClick}  />
      )) }
    </div>
  )
}
