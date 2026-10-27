import { getFileExtension } from "#lib/file";
import { formatFileSize, getReadTimeChars, timeRead } from "#lib/text";
import { formattedTimeText } from "#lib/time";
import { getTimeAgo } from "#lib/date";
import { Button } from "#ui/button";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, ChevronLeft, Clock3, FileText, Languages, UserRound } from "lucide-react";

export function BookPage() {
  const routeApi = getRouteApi("/book/$bookId/");
  const navigate = useNavigate();
  const data = routeApi.useLoaderData();
  if (data.status === "error") {
    void navigate({ to: "/" });
    return null;
  }

  const book = data.data;
  const chapters = book.chapters ?? [];
  const extension = getFileExtension(book.meta.path);
  const readTime = formattedTimeText(timeRead(getReadTimeChars(extension, 200)), "m");

  return <div className="window">
    <div className="mx-auto w-full max-w-6xl p-5 md:p-10">
      <Button variant="ghost" className="mb-6" onClick={() => void navigate({ to: "/" })}><ChevronLeft /> Библиотека</Button>
      <div className="grid gap-8  md:grid-cols-[minmax(100px,160px)_1fr]">
        <div className="space-y-4 flex justify-center items-center flex-col">
          <div className="aspect-[2/3] md:w-full w-[40%]  overflow-hidden rounded-2xl border bg-sidebar shadow-sm">
            {book.meta.cover_path ? <img src={book.meta.cover_path} alt={`Обложка: ${book.meta.title}`} className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground"><BookOpen size={52} /><span>Нет обложки</span></div>}
          </div>
          <Link to="/book/$bookId/read" params={{ bookId: book.id }} className="block md:w-full w-[40%]"><Button size="lg" className="w-full"><BookOpen /> Читать книгу</Button></Link>
        </div>

        <section className="min-w-0 space-y-6">
          <header><p className="mb-2 text-sm text-muted-foreground">{book.meta.genres?.join(" · ") || "Книга"}</p><h1 className="text-3xl font-bold leading-tight md:text-4xl">{book.meta.title}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-muted-foreground">{book.meta.author && <span className="inline-flex items-center gap-2"><UserRound size={16} />{book.meta.author}</span>}{book.meta.language && <span className="inline-flex items-center gap-2"><Languages size={16} />{book.meta.language}</span>}</div>
          </header>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Info label="Главы" value={String(chapters.length)} icon={<BookOpen size={16} />} />
            <Info label="Чтение" value={readTime} icon={<Clock3 size={16} />} />
            <Info label="Формат" value={extension.toUpperCase()} icon={<FileText size={16} />} />
            <Info label="Размер" value={formatFileSize(book.meta.size)} icon={<FileText size={16} />} />
          </div>
          {book.meta.description && <section><h2 className="mb-2 text-lg font-semibold">Об этой книге</h2><p className="whitespace-pre-line leading-7 text-muted-foreground">{book.meta.description}</p></section>}
          <p className="text-xs text-muted-foreground">Добавлена {getTimeAgo(book.meta.created_at)}</p>
        </section>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">Содержание</h2><p className="mt-1 text-sm text-muted-foreground">{chapters.length ? `${chapters.length} ${chapters.length === 1 ? "глава" : "глав"}` : "Оглавление недоступно"}</p></div></div>
        {chapters.length > 0 && <ol className="divide-y overflow-hidden rounded-xl border bg-background">{chapters.map((chapter, index) => <li key={chapter.id} className="flex items-center gap-4 px-4 py-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm text-muted-foreground">{index + 1}</span><span className="min-w-0 flex-1 truncate">{chapter.title || `Глава ${index + 1}`}</span></li>)}</ol>}
      </section>
    </div>
  </div>;
}

function Info({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-xl border bg-background p-3"><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div><div className="font-medium">{value}</div></div>;
}
