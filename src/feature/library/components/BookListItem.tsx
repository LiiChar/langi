import { Book } from "@/entities/book/book.type"

export type BookListItemType = {
  book: Book
}

export const BookListItem = ({ book }: BookListItemType) => {
  return (
    <div>
      { book.meta.title }
    </div>
  )
}
