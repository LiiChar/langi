import { Book } from "@/entities/book/book.type"
import { HeaderBook } from "./HeaderBook"
import { HeaderSearch } from "./HeaderSearch";
import { HeaderActions } from "./HeaderActions";

export const Header = () => {

  let book: null | Book = null;

  return (
    <div className="border-b-[1px] border-border/60 p-2 px-3">
      <div className="flex justify-between">
        <div>
          {book && <HeaderBook book={book} />}
        </div>
        <div className="flex gap-2">
          <HeaderActions />
          <HeaderSearch />
        </div>
      </div>
    </div>
  )
}
