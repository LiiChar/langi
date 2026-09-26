import { Book } from "@/entities/book/book.type"
import { BookListItem } from "./BookListItem"

export type BookListType = {
  books: Book[];
  selectedBookId: string | null;
  onClick: (id: string) => void;
}

export const BookList = ({ books, selectedBookId, onClick }: BookListType) => {
  return (
    <div className='flex flex-col gap-2'>
      {books.map(b => (
        <BookListItem key={b.id} book={ b } selected={selectedBookId === b.id} onHandleClick={onClick} />
      )) }
    </div>
  )
}
