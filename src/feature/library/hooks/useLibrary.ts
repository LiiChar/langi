import { useBooksStore } from "@/feature/book/store/BookStore"
import { useEffect } from "react";
import { useLibraryStore } from "../store/LibraryStore";
import { commands } from "@/shared/commands/bindings";
import { convertBook } from "@/shared/commands/import";


export const useLibrary = () => {
  let books = useBooksStore((state) => state.books);
  let setBooks = useBooksStore((state) => state.setBooks);
  let search = useLibraryStore((state) => state.search);

  useEffect(() => {
    if (search) {
      // setBook(query);
      return;
    }

    const loadBooks = async () => {
      const result = await commands.getBooks();
      if (result.status === "ok") {
        setBooks((result.data.map(convertBook)));
      }
    }

    loadBooks();
  }, [search])


  return books
}
