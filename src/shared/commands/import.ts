import { Book } from "@/entities/book/book.type";
import { Book as BookBinding } from "./bindings";

export const convertBook = (book: BookBinding): Book => {
  return {
    chapters: book.chapters ?? [],
    meta: {
      title: book.meta.title,
      author: book.meta.author,
      language: book.meta.language,
      cover_path: book.meta.cover_path,
      description: book.meta.description,
      genres: book.meta.genres,
      chars_read: null,
      progress_read: null,
      count_chapters: book.chapters?.length ?? 0,
      current_chapter: 0,
      created_at: book.meta.created_at,
      last_read_at: book.meta.last_read_at,
      last_modified: book.meta.last_modified,
      path: book.meta.path,
      size: book.meta.size,
    },
    id: book.id,
  }
}
