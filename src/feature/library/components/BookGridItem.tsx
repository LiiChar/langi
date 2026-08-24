import { Book } from "@/entities/book/book.type"

export type BookGridItemType = {
  book: Book
}

export const BookGridItem = ({ book }: BookGridItemType) => {
  return (
    <div>
      { book.meta.title }
    </div>
  )
}
