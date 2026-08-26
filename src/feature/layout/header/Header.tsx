import { Book } from "@/entities/book/book.type"
import { HeaderBook } from "./HeaderBook"
import { HeaderSearch } from "./HeaderSearch";
import { HeaderActions } from "./HeaderActions";
import { HeaderDecoration } from "./HeaderDecoration";

export const Header = () => {

  let book: null | Book = null;

  return (
    <div className=" p-1 px-3 bg-sidebar" data-tauri-drag-region>
      <div className="flex justify-between">
        <div>
          {book && <HeaderBook book={book} />}
        </div>
        <div className="flex gap-2">
          <HeaderActions />
          <HeaderSearch />
          <HeaderDecoration />
        </div>
      </div>
    </div>
  )
}
