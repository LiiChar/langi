import { BookCollection } from "../components/BookCollection"
import { useLibraryStore } from "../store/LibraryStore"
import { useNavigate } from "@tanstack/react-router"
import { useBooksStore } from "@/feature/book/store/BookStore"
import { useEffect, useRef, useState } from "react"
import { Book } from "@/entities/book/book.type"
import { commands, events } from "@/shared/commands/bindings"
import { convertBook } from "@/shared/commands/import"
import { toast } from "#ui/toast"
import { formatFileSize } from "#lib/text"
import { useI18n } from "@/shared/i18n"
import { useDiscoverStore } from "../store/DiscoverStore"
import { PageHeading } from "#ui/page-heading"

export const BrowserPage = () => {
  const { page, variant } = useLibraryStore()
  const setSelectedBookId = useBooksStore((state) => state.setSelectedBook);
  const [books, setBooks] = useState<Book[]>([]);
  const [loadedProvider, setLoadedProvider] = useState("");
  const provider = useDiscoverStore((state) => state.provider);
  const setProvider = useDiscoverStore((state) => state.setProvider);
  const setProviders = useDiscoverStore((state) => state.setProviders);
  const query = useDiscoverStore((state) => state.query);
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();
  const translateRef = useRef(t);
  translateRef.current = t;
  const setLibraryBooks = useBooksStore((state) => state.setBooks);
  const navigate = useNavigate();
  const toastId = useRef("")

  const selected = books[page]?.id;

  useEffect(() => {
    let active = true;
    const fetchProviders = async () => {
      const providerList = await commands.getBrowserProviders();
      if (!active) return;
      setProviders(providerList);
      const currentProvider = useDiscoverStore.getState().provider;
      if (providerList[0] && !providerList.includes(currentProvider)) setProvider(providerList[0]);
    };

    const unlisten = events.downloadEvent.listen((evt) => {
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

    void fetchProviders();
    return () => { active = false; void unlisten.then((dispose) => dispose()); };
  }, [setProvider, setProviders]);

  useEffect(() => {
    if (!provider) return;
    let active = true;
    setLoading(true);
    void commands.getBrowserBooks(provider)
      .then((result) => {
        if (!active) return;
        if (result.status === "ok") {
          setBooks(result.data.map(convertBook));
          setLoadedProvider(provider);
        } else {
          toast.add({ title: translateRef.current("common.error"), description: String(result.error) });
        }
      })
      .catch((error: unknown) => {
        if (active) toast.add({ title: translateRef.current("common.error"), description: String(error) });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [provider]);
  const visibleBooks = books.filter((book) => `${book.meta.title} ${book.meta.author ?? ""} ${book.meta.description ?? ""}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));

  const handleBookClick = async (bookId: string) => {
    toast.promise(
      new Promise<{ name: string, id: string }>(async (resolve, reject) => {

        let book = await commands.downloadBook(provider, bookId, "")

        if (book.status === "error") reject(book.error);
        if (book.status === "ok") {
          const bookParsed = await commands.commandParseBook(book.data.meta.path);
          if (bookParsed.status === "error") reject(bookParsed.error);
          if (bookParsed.status === "ok") {
            setLibraryBooks([...useBooksStore.getState().books.filter((b) => b.id !== bookParsed.data.id), convertBook(bookParsed.data)]);
            resolve({ name: bookParsed.data.meta.title, id: bookParsed.data.id });
          }
        }
      }),
      {
        loading: {
          title: "Загрузка книги...",
        },
        success: (data) => {
          setSelectedBookId(data.id);
          navigate({ to: `/book/${data.id}/read`});
          return `Книга ${data.name} скачена.`;
        },
        error: (err) => `Error: ${err}`,
      }
    )
  }

  return (
    <div className="window gap-4 p-2">
      <PageHeading title={t("browser.title")} description={t("browser.subtitle")} />
      {
        loading && loadedProvider !== provider ? <p className="surface p-10 text-center text-muted-foreground">{t("browser.loading")}</p> : loadedProvider !== provider || visibleBooks.length === 0 ? <p className="surface p-10 text-center text-muted-foreground">{t("browser.noResults")}</p> : <BookCollection variant={variant} selectedBookId={selected} books={visibleBooks} onBookClick={handleBookClick} />
      }
    </div>
  )
}
