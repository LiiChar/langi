import { BookGrid } from "../components/BookGrid"
import { BookList } from "../components/BookList"
import { useLibraryStore } from "../store/LibraryStore"
import { useLibrary } from "../hooks/useLibrary"
import { useNavigate } from "@tanstack/react-router"
import { useBooksStore } from "@/feature/book/store/BookStore"
import { useEffect, useState } from "react"
import { Book } from "@/entities/book/book.type"
import { commands, events } from "@/shared/commands/bindings"
import { convertBook } from "@/shared/commands/import"
import { ButtonGroup } from "#ui/button-group"
import { Button } from "#ui/button"

export const BrowserPage = () => {
  const { page, viewMode, variant } = useLibraryStore()
  const setSelectedBookId = useBooksStore((state) => state.setSelectedBook);
  const [books, setBooks] = useState<Book[]>([]);
  const [provider, setProvider] = useState("");
  const [providers, setProviders] = useState<string[]>([]);

  const navigate = useNavigate();

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

    events.downloadEvent.listen((event) => {
      console.log(event);
    });

    fetchBooks();
  }, [])

  const handleBookClick = async (bookId: string) => {
    commands.downloadBook(provider, bookId, "")
    // const provider = await commands.getBrowserProviders();
    // console.log(provider);
    // const result = await commands.getBrowserBooks(provider[0]);
    // if(result.status === "ok") {
    //   setBooks(result.data.map(convertBook));
    // }
    // navigate({ to: `/book/${bookId}/read`});
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
