import { Book } from "@/entities/book/book.type"
import { BookGridItem } from "./BookGridItem"

export type BookGridType = {
  books: Book[]
}

export const BookGrid = ({ books }: BookGridType) => {
  return (
    <div>
      {books.map(b => (
        <BookGridItem book={ b } />
      )) }
    </div>
  )
}
