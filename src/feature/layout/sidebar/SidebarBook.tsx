import { Book } from "@/entities/book/book.type";
import { Link, useMatchRoute } from "@tanstack/react-router";
import { BookImage } from "lucide-react";

export type SidebarBookType = {
  book: Book;
};

export const SidebarBook = ({ book }: SidebarBookType) => {

  const matchRoute = useMatchRoute()
  const isReadPage = matchRoute({ to: '/book/$bookId/read', params: { bookId: book.id } })
  const isBookPage = matchRoute({ to: '/book/$bookId', params: { bookId: book.id } })

  const link = () => {
    if (isReadPage) return `/book/${book.id}/`
    if (isBookPage) return `/book/${book.id}/read`
    return `/book/${book.id}/read`
  }


  return (
    <Link to={link()}>
      <div
        className={`
          group
          flex
          min-w-0
          w-full
          items-center
          gap-2
          overflow-hidden
          rounded-md
          p-1
          transition-colors
          hover:bg-sidebar/60
          group-data-[collapsible=icon]:-translate-x-[1px]
          ${isReadPage ? 'bg-sidebar/60' : ''}
        `}
      >
        <div
          className="
            relative
            h-12
            w-9
            shrink-0
            overflow-hidden
            rounded-sm
            bg-background
            ring-1
            ring-border/40
          "
        >
          {book.meta.cover_path ? (
            <img
              src={book.meta.cover_path}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <BookImage size={18} strokeWidth={1.7} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <div
            className="
              min-w-0
              line-clamp-2
              text-sm
              font-medium
              leading-tight
            "
            title={book.meta.title}
          >
            {book.meta.title}
          </div>

          <div className="truncate text-xs text-muted-foreground">
            Chapter {book.meta.current_chapter + 1}
          </div>
        </div>
      </div>
    </Link>
  );
};
