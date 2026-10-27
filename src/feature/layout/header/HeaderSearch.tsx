import { useEffect, useId, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { SearchIcon, LoaderCircleIcon, X } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#ui/input-group";
import { Kbd } from "#ui/kbd";
import { useBooksStore } from "@/feature/book/store/BookStore";
import { useLibraryStore } from "@/feature/library/store/LibraryStore";
import { useI18n } from "@/shared/i18n";

export const HeaderSearch = () => {
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const id = useId();
  const books = useBooksStore((s) => s.books);
  const setLibrarySearch = useLibraryStore((s) => s.setSearch);
  const navigate = useNavigate();
  const { t } = useI18n();
  const results = useMemo(() => {
    const query = value.trim().toLocaleLowerCase();
    if (!query) return [];
    return books.flatMap((book) => {
      const meta = `${book.meta.title} ${book.meta.author ?? ""} ${book.meta.description ?? ""}`;
      if (meta.toLocaleLowerCase().includes(query)) return [{ book, excerpt: meta }];
      const chapter = book.chapters?.find((item) => item.html?.toLocaleLowerCase().includes(query));
      return chapter ? [{ book, excerpt: chapter.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 150) }] : [];
    }).slice(0, 8);
  }, [books, value]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); document.getElementById(id)?.focus();
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [id]);
  useEffect(() => {
    setIsLoading(true);
    const timer = window.setTimeout(() => setIsLoading(false), 150);
    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <div className="relative w-full max-w-sm hidden md:block" onClick={(e) => e.stopPropagation()}>
      <InputGroup className="h-8">
        <InputGroupAddon>
          <SearchIcon className="size-4" />
          <span className="sr-only">{t("search.placeholder")}
          </span>
        </InputGroupAddon>
        <InputGroupInput
          id={id} type="search"
          placeholder={t("search.placeholder")}
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setValue(e.target.value); setOpen(true); }}
          className="[&::-webkit-search-cancel-button]:appearance-none"
        />
        <InputGroupAddon align="inline-end" className="pointer-events-none text-muted-foreground">
          {isLoading
            ? <LoaderCircleIcon className="size-4 animate-spin" />
            : value
              ? <button className="pointer-events-auto" onClick={() => setValue("")} aria-label="Clear"><X className="size-4" /></button>
              : <Kbd>⌘K</Kbd>
          }
        </InputGroupAddon>
      </InputGroup>

      {open && value.trim() && <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[60vh] overflow-auto rounded-lg border bg-popover p-1 shadow-lg">
        {results.length ? results.map(({ book, excerpt }) => <button key={book.id} className="block w-full rounded-md px-3 py-2 text-left hover:bg-accent" onClick={() => { setOpen(false); setValue(""); navigate({ to: `/book/${book.id}/read` }); }}>
          <span className="block truncate text-sm font-medium">{book.meta.title}</span><span className="block truncate text-xs text-muted-foreground">{excerpt}</span>
        </button>) : <p className="p-3 text-sm text-muted-foreground">{t("search.empty")}</p>}
        <button className="w-full border-t px-3 py-2 text-left text-xs text-muted-foreground hover:text-foreground" onClick={() => { setLibrarySearch(value); setOpen(false); navigate({ to: "/" }); }}>{t("search.hint")}</button>
      </div>}
      </div>
    );
};
