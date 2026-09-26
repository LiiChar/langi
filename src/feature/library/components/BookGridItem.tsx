import { getFileExtension } from "#lib/file";
import { Book } from "@/entities/book/book.type";
import { BookImage } from "lucide-react";
import { HTMLAttributes, useEffect, useState } from "react";

export type BookCardProps = {
  book: Book;
  selected: boolean;
  onHandleClick: (id: string) => void;
} & HTMLAttributes<HTMLDivElement>;

export function BookGridItem({
  book,
  selected,
  onHandleClick,
  className,
  ...rest
}: BookCardProps) {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    // const value = calculateReadingProgress(book);

    // setPercent(value);
  }, [book]);

  return (
    <div
      {...rest}
      onClick={() => onHandleClick(book.id)}
      className={`
        group relative aspect-2/3 rounded-xl overflow-hidden cursor-pointer
        bg-secondary hover:bg-secondary/60
        border border-border hover:border-border/60
        transition-all duration-200 hover:scale-[1.02] hover:shadow-xl
        animate-fade-in
        ${className ?? ""}
      `}
      // style={{
      //   ...rest.style,
      //   animationDelay: `${Math.min(index, 20) * 0.03}s`,
      // }}
    >
      {/* Reading progress */}
      {percent > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] pointer-events-none z-10">
          <div
            className="h-full transition-[width] duration-200 bg-primary"
            style={{
              width: `${percent}%`,
              borderRadius: "0 0 12px 12px",
            }}
          />
        </div>
      )}

      {/* File extension */}
      {book.meta.path && <div className="absolute top-2 right-2 text-sm glass rounded-md p-1 py-0 z-10 border bg-secondary/60 border-secondary/40">
        {getFileExtension(book.meta.path)}
     </div>}

      {/* Cover */}
      {
        book.meta.cover_path ? (
          <img
            src={book.meta.cover_path}
            alt={book.meta.title}
            className="absolute inset-0 w-full h-full object-cover"
            />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center">
              <BookImage
                size={32}
                className="mx-auto mb-2 text-muted-foreground"
              />

              <p className="text-xs text-muted-foreground line-clamp-3">
                {book.meta.title}
              </p>
            </div>
          </div>
        )
      }

      {/* Gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/100 via-background/60 to-transparent" />

      {/* Info */}
      <div className="absolute inset-x-0 bottom-0 p-3">
        <h3 className="text-white font-medium text-sm line-clamp-2 drop-shadow-lg">
          {book.meta.title || "Без названия"}
        </h3>

        {book.meta.author && (
          <p className="text-white/70 text-xs mt-1 truncate drop-shadow">
            {book.meta.author}
          </p>
        )}
      </div>
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
