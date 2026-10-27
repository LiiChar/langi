import { useBooksStore } from "@/feature/book/store/BookStore"
import { useEffect } from "react";
import { useLibraryStore } from "../store/LibraryStore";
import { commands } from "@/shared/commands/bindings";
import { convertBook } from "@/shared/commands/import";
import { useMemo } from "react";


export const useLibrary = () => {
  let books = useBooksStore((state) => state.books);
  let setBooks = useBooksStore((state) => state.setBooks);
  let search = useLibraryStore((state) => state.search);
  const caseSensitive = useLibraryStore((state) => state.caseSensitive);
  const sortMode = useLibraryStore((state) => state.sortMode);

  useEffect(() => {
    const loadBooks = async () => {
      const result = await commands.getBooks();
      if (result.status === "ok") {
        setBooks((result.data.map(convertBook)));
      }
    }

    loadBooks();
  }, [setBooks])

  return useMemo(() => {
    const query = search?.trim();
    const normalized = query && !caseSensitive ? query.toLocaleLowerCase() : query;
    const filtered = normalized ? books.filter((book) => {
      const text = [book.meta.title, book.meta.author, book.meta.description, ...(book.chapters ?? []).map((chapter) => chapter.html)]
        .filter(Boolean).join(" ");
      return (caseSensitive ? text : text.toLocaleLowerCase()).includes(normalized);
    }) : [...books];
    return filtered.sort((a, b) => sortMode === "title"
      ? a.meta.title.localeCompare(b.meta.title)
      : b.meta.last_read_at - a.meta.last_read_at);
  }, [books, search, caseSensitive, sortMode]);
}
