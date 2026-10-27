import { Book } from "@/entities/book/book.type";
import { BookImage, ChevronRight } from "lucide-react";
import { HTMLAttributes } from "react";

export type BookCardProps = {
  book: Book;
  selected: boolean;
  onHandleClick: (id: string) => void;
} & HTMLAttributes<HTMLDivElement>;

export function BookListItem({
  book,
  selected,
  onHandleClick,
  className,
  ...rest
}: BookCardProps) {
  const percent = Math.max(0, Math.min(100, book.meta.progress_read ?? 0));
  return (
    <div
      {...rest}
      className={`
        flex items-center gap-4 cursor-pointer w-full
        bg-card
        hover:bg-card/60
        transition-all duration- *:150
        animate-fade-in
        rounded-lg pr-3
        ${className ?? ""}
      `}
      onClick={() => onHandleClick(book.id)}
    >
      {/* Reading progress */}
      {percent > 0 && (
        <div className="absolute inset-0 rounded-xl z-[5] pointer-events-none overflow-hidden">
          <div
            className="h-full transition-[width] duration-200 bg-primary/10"
            style={{
              width: `${percent}%`,
            }}
          />
        </div>
      )}

      {/* Cover */}
      <div className="w-12 h-16 rounded-md overflow-hidden bg-card-hover/60 shrink-0 relative z-10">
        {book.meta.cover_path ? (
          <img
            src={book.meta.cover_path}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center pl-3">
            <BookImage
              size={20}
              className="text-muted-foreground"
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 relative z-10">
        <h3 className="font-medium truncate">
          {book.meta.title || "Без названия"}
        </h3>

        <p className="text-sm text-muted-foreground truncate">
          {book.meta.author || "Неизвестный автор"}
        </p>
      </div>

      {/* Chapters count */}
      {book.chapters && book.chapters?.length != 0 &&
        <span className="text-xs text-muted-foreground shrink-0 relative z-10">
          {book.chapters?.length ?? 0} глав
        </span>
      }

      {/* Arrow */}
      <ChevronRight
        size={18}
        className="text-muted-foreground relative z-10"
      />
    </div>
  );
}

// function calculateReadingProgress(book: BookCardProps["book"]): number {
//   if (!book.chapters?.length) {
//     return 0;
//   }

//   const anchor = book.position?.anchor_text?.trim();

//   if (!anchor) {
//     return 0;
//   }

//   const fullText = book.chapters
//     .map((chapter) => stripHtml(chapter.html))
//     .join("\n");

//   if (!fullText) {
//     return 0;
//   }

//   const index = fullText.indexOf(anchor);

//   if (index < 0) {
//     return 0;
//   }

//   const value = Math.round((index / fullText.length) * 100);

//   return Math.min(Math.max(value, 1), 100);
// }
