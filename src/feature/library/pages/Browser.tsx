import { BookGrid } from "../components/BookGrid"
import { BookList } from "../components/BookList"
import { useLibraryStore } from "../store/LibraryStore"
import { useLibrary } from "../hooks/useLibrary"
import { useNavigate } from "@tanstack/react-router"
import { useBooksStore } from "@/feature/book/store/BookStore"
import { useEffect, useRef, useState } from "react"
import { Book } from "@/entities/book/book.type"
import { commands, DownloadEvent, events } from "@/shared/commands/bindings"
import { convertBook } from "@/shared/commands/import"
import { ButtonGroup } from "#ui/button-group"
import { Button } from "#ui/button"
import { toast } from "#ui/toast"
import { formatFileSize } from "#lib/text"

export const BrowserPage = () => {
  const { page, viewMode, variant } = useLibraryStore()
  const setSelectedBookId = useBooksStore((state) => state.setSelectedBook);
  const [books, setBooks] = useState<Book[]>([]);
  const [provider, setProvider] = useState("");
  const [providers, setProviders] = useState<string[]>([]);
  const navigate = useNavigate();
  const toastId = useRef("")

  const selected = books[page]?.id;

  useEffect(() => {

    const fetchBooks = async () => {
      const provider = await commands.getBrowserProviders();
      setProviders(provider);
      setProvider(provider[0]);
      const result = await commands.getBrowserBooks(provider[0]);
      if(result.status === "ok") {
        setBooks(result.data.map(convertBook));
      }
    };

    events.downloadEvent.listen((evt) => {
      if (evt.event == "download-event") {
        if (evt.payload.event_type == "Progress") {
          if (toastId.current == "") {
            toastId.current = toast.add({
              title: `Загружается: 0% - 0 Б/c`
            })
          }
          toast.update(toastId.current, {
            title: `Загружается: ${evt.payload.progress}% - ${formatFileSize(evt.payload.speed)}/c`
          })
        }
        if (evt.payload.event_type == "Failed") {
          toast.close(toastId.current)
        }
        if (evt.payload.event_type == "Completed") {
          toast.close(toastId.current)
        }
      }
    });

    fetchBooks();
  }, [])

  const handleBookClick = async (bookId: string) => {
    toast.promise(
      new Promise<{ name: string, id: string }>(async (resolve, reject) => {

        let book = await commands.downloadBook(provider, bookId, "")

        if (book.status === "error") reject(book.error);
        if (book.status === "ok") {
          const bookParsed = await commands.commandParseBook(book.data.meta.path);
          if (bookParsed.status === "error") reject(bookParsed.error);
          if (bookParsed.status === "ok") {
            resolve({ name: bookParsed.data.meta.title, id: bookId });
          }
        }
      }),
      {
        loading: {
          title: "Загрузка книги...",
        },
        success: (data) => {
          navigate({ to: `/book/${bookId}/read`});
          return `Книга ${data.name} скачена.`;
        },
        error: (err) => `Error: ${err}`,
      }
    )
  }

  return (
    <div className="p-2 window">
      {
        variant == "grid"
        ? <BookGrid selectedBookId={selected} books={books} onClick={handleBookClick} />
        : <BookList selectedBookId={selected} books={books} onClick={handleBookClick} />
      }

      <ButtonGroup className="absolute top-12 right-5">
        {
          providers.map((provider) => (
            <Button key={provider}>{provider}</Button>
          ))
        }
      </ButtonGroup>
    </div>
  )
}
