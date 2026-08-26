import { Separator } from "#ui/separator";
import { Book } from "@/entities/book/book.type"

export type HeaderBookType = {
  book: Book
}

export const HeaderBook = ({ book }: HeaderBookType) => {

  let title = book.chapters[book.meta.count_chapters].title;

  return (
    <div className="flex gap-0.5 items-center">
      <div className="flex gap-1">
        {book.meta.cover_path && (
          <div>
            <img src={book.meta.cover_path} alt={book.meta.title}/>
          </div>
        )}
        <div className="gap-0.5 flex flex-col justify-center">
          <div>{book.meta.title}</div>
          <div>{book.meta.author}</div>
        </div>
      </div>
      <Separator orientation="vertical" />
      <div className="gap-0.5 flex flex-col justify-center">
        <div>Chapter {book.meta.current_chapter + 1}</div>
        {title && <div>{title}</div>}
      </div>
    </div>
  )
}
