import { Book } from "@/entities/book/book.type"
import { BookListItem } from "./BookListItem"

export type BookListType = {
  books: Book[]
}

export const BookList = ({ books }: BookListType) => {
  return (
    <div>
      {books.map(b => (
        <BookListItem book={ b } />
      )) }
    </div>
  )
}
