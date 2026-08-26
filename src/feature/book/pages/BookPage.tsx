import { getFileExtension } from "#lib/file";
import { formatFileSize, getReadTimeChars, timeRead } from "#lib/text";
import { formattedTimeText } from "#lib/time";
import { Button } from "#ui/button";
import { Book } from "@/entities/book/book.type";
import { getRouteApi, useNavigate, useParams } from "@tanstack/react-router";
import { Bookmark, BookOpen, BookOpenIcon, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useBooksStore } from "../store/BookStore";
import { getTimeAgo } from "#lib/date";

export function BookPage() {
  const routeApi = getRouteApi('/book/$bookId')
  const navigate = useNavigate();

  const data = routeApi.useLoaderData()

  if (data.status == 'error') {
    navigate({to: "/"});
    return null;
  }

  const book = data.data;

  const loadBook = useCallback(async () => {
    try {
      // TODO! Загрузка книги
    } catch (err) {
      // TODO! Обработка ошибки
      // toast.error("Не удалось загрузить книгу");
      // navigate("/", {
      //   replace: true,
      // });
    } finally {
      // setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadBook();
  }, [loadBook]);



  const chaptersCount = book.chapters?.length ?? 0;

  // const progress =
  //   (book.meta.progress_read ?? 0) /
  //   (book.meta.chars_read ?? 0);

  const progress = 0;

  const progressPercent = progress * 100;

  const hasProgress =
    Number.isFinite(progressPercent) &&
    progressPercent > 0;

  const fileExtension = getFileExtension(book.meta.path);

  const readTime = formattedTimeText(
    timeRead(getReadTimeChars(fileExtension, 200)),
    "m",
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto relative">
        {/* Back button */}


        <header
          data-tauri-drag-region
          className="h-6 fixed top-0 w-full z-10"
        />

        <div
          className="
            grid mt-6
            grid-cols-1
            md:grid-cols-3
            gap-8
            pl-6 pr-6 pt-8
          "
        >
          {/* Cover */}
          <div className="md:col-span-1 relative">
            <div
              className="absolute top-0 left-0 z-20 rounded-full bg-background! p-1 border-none -translate-y-1/3 -translate-x-1/3"
            >
            <Button
              variant={"default"}
              onClick={() => navigate({ to: "/" })}
              size="icon"
              className=""
            >
              <ChevronLeft
                size={18}
                className="-ml-0.5"
              />
            </Button>
            </div>
            <div
              className="
                overflow-hidden
                max-h-[50vh]
                h-full
                w-full
                flex
                justify-center
                items-center
              "
            >
              {book.meta.cover_path
                      ?
                      (
                        <img
                          src={book.meta.path}
                          alt={book.meta.title}
                          className="
                            h-full
                            object-cover
                            aspect-2/3
                            overflow-hidden
                            rounded-lg
                          "
                        />
                      )
                      :
                      (

                          <div
                            className="
                              w-full h-full
                              flex items-center justify-center
                              rounded-lg
                              bg-secondary/60
                            "
                          >
                            <div className="text-center p-6">
                              <BookOpenIcon
                                size={48}
                                className="
                                  mx-auto mb-3
                                  text-muted-foreground
                                "
                              />

                              <p className="text-sm text-muted-foreground">
                                Нет обложки
                              </p>
                            </div>
                          </div>
                      )
                }

            </div>

            {book.meta.description && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Button
                  className="w-full"
                  size="lg"
                  // onClick={handleStartReading}
                >
                  <BookOpen
                    size={20}
                  />

                  Читать
                </Button>

                <Button
                  className="w-full"
                  size="lg"
                  // onClick={toggleShowBookmarks}
                >
                  <Bookmark
                    // className={`
                    //   ${
                    //     showBookmarks
                    //       ? "fill-foreground"
                    //       : ""
                    //   }
                    //   transition-all
                    // `}
                    name="bookmark"
                    size={20}
                  />

                  {/*Закладки ({bookmarks.length})*/}
                </Button>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="md:col-span-2 space-y-3">
            {/* Title and author */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                {book.meta.title}
              </h1>

              {book.meta.author && (
                <div
                  className="
                    flex items-center
                    gap-2
                    justify-between
                    flex-wrap
                  "
                >
                  <p className="text-lg text-muted-foreground">
                    {book.meta.author}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    <div
                      className="
                        px-3 py-1.5
                        rounded-full
                        text-xs font-medium
                        bg-secondary
                        border border-border
                        text-secondary-foreground
                      "
                    >
                      {chaptersCount} глав
                    </div>

                    <div
                      className="
                        px-3 py-1.5
                        rounded-full
                        text-xs font-medium
                        bg-secondary
                        border border-border
                        uppercase
                        tracking-wide
                        text-secondary-foreground
                      "
                    >
                      {fileExtension}
                    </div>

                    {book.meta.language && (
                      <div
                        className="
                          px-3 py-1.5
                          rounded-full
                          text-xs font-medium
                          bg-secondary
                          border border-border
                          text-secondary-foreground
                          backdrop-blur-sm
                        "
                      >
                        {book.meta.language}
                      </div>
                    )}

                    {hasProgress && (
                      <div
                        className="
                          px-3 py-1.5
                          rounded-full
                          text-xs font-medium
                          bg-secondary
                          border border-border
                          text-secondary-foreground
                          backdrop-blur-sm
                        "
                      >
                        {progressPercent.toFixed(2)}%
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="space-y-3">
              <div
                className="
                  grid
                  grid-cols-2
                  sm:grid-cols-3
                  gap-1
                  text-sm
                "
              >
                {/* ID */}
                <div
                  className="
                    rounded-2xl
                    bg-secondary
                    border border-border
                    p-2
                    group
                  "
                >
                  <div className="text-muted-foreground text-xs mb-1">
                    Уникальный ID
                  </div>

                  <div
                    className="
                      font-mono
                      text-xs
                      break-all
                      opacity-90
                      line-clamp-1
                      group-focus:line-clamp-none
                    "
                  >
                    {book.id}
                  </div>
                </div>

                {/* Path */}
                {/*<div
                  className="
                    rounded-2xl
                    bg-secondary
                    border border-border
                    p-2
                    sm:col-span-2
                    group
                  "
                  onClick={handleCopyPath}
                >
                  <div className="text-muted-foreground text-xs mb-1">
                    Путь
                  </div>

                  <div
                    className="
                      font-mono
                      text-xs
                      break-all
                      opacity-80
                      line-clamp-1
                      group-focus:line-clamp-none
                    "
                  >
                    {book.meta.path
                      .split("/")
                      .slice(-1)[0]}
                  </div>
                </div>*/}

                {/* Created */}
                <div
                  className="
                    rounded-2xl
                    bg-secondary
                    border border-border
                    p-2
                    group
                  "
                >
                  <div className="text-muted-foreground text-xs mb-1">
                    Добавлено
                  </div>

                  <div className="line-clamp-1 group-hover:line-clamp-none">
                    {getTimeAgo(book.meta.created_at)}
                  </div>
                </div>

                {/* Reading time */}
                <div
                  className="
                    rounded-2xl
                    bg-secondary
                    border border-border
                    p-2
                  "
                >
                  <div className="text-muted-foreground text-xs mb-1">
                    Время чтения
                  </div>

                  <div>{readTime}</div>
                </div>

                {/* Size */}
                <div
                  className="
                    rounded-2xl
                    bg-secondary
                    border border-border
                    p-2
                  "
                >
                  <div className="text-muted-foreground text-xs mb-1">
                    Размер
                  </div>

                  <div>
                    {formatFileSize(book.meta.size)}
                  </div>
                </div>
              </div>
            </div>

            {/* Genres / Description */}
            <div>
              {(book.meta.genres?.length ?? 0) > 0 && (
                <>
                  <div className="text-muted-foreground text-xs mb-1">
                    Жанры
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {book.meta.genres?.map((genre) => (
                      <div
                        key={genre}
                        className="
                          rounded-full
                          bg-secondary
                          text-muted-foreground
                          px-2 py-1
                        "
                      >
                        {genre}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {book.meta.description && (
                <>
                  <div className="text-muted-foreground text-xs mb-1 mt-2">
                    Аннотация
                  </div>

                  <div>
                    {book.meta.description}
                  </div>
                </>
              )}
            </div>

            {!book.meta.description && (
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  // onClick={handleStartReading}
                >
                  <BookOpen
                    size={20}
                  />

                  Читать
                </Button>

                <Button
                  size="lg"
                  // onClick={toggleShowBookmarks}
                  className="shadow-none!"
                >
                  <Bookmark
                    // className={`
                    //   ${
                    //     showBookmarks
                    //       ? "fill-foreground"
                    //       : ""
                    //   }
                    //   transition-all
                    // `}
                    size={20}
                  />

                  Закладки
                </Button>
              </div>
            )}

            {/* Bookmarks preview
            {bookmarks.length > 0 && showBookmarks && (
              <div
                className="space-y-2"
              >
                <h3
                  className="
                    font-medium
                    text-sm
                    text-muted-foreground
                    mb-3
                  "
                >
                  Последние закладки
                </h3>

                {bookmarks
                  .slice(0, 3)
                  .map((bm) => (
                    <div
                      key={bm.id}
                      className="
                        flex items-start
                        gap-3
                        p-2
                        rounded-lg
                        hover:bg-secondary/60
                        cursor-pointer
                        transition-colors
                      "
                    >
                      <Icon
                        name="bookmarkSolid"
                        size={16}
                        className="
                          text-primary
                          mt-0.5
                          shrink-0
                        "
                      />

                      <p className="text-sm line-clamp-2">
                        {bm.preview}
                      </p>
                    </div>
                  ))}
              </div>
            )}*/}
          </div>
        </div>

        {/* Table of contents */}
        <div className="mt-10 px-6 pb-6">
          <div
            className="
              flex items-center
              justify-between
              mb-4
              gap-4
              flex-wrap
            "
          >
            <h2
              className="
                text-lg
                font-semibold
                flex
                items-center
                gap-2
              "
            >
              Содержание
            </h2>

            {/* Quick navigation */}
            <div
              className="
                flex items-center
                gap-2
                text-xs
              "
            >
              <button
                // onClick={() => setShowChapters(1)}
                className="
                  px-3 py-1
                  rounded-lg
                  bg-secondary
                  hover:bg-secondary/60
                  transition-colors
                "
              >
                Начало
              </button>

              <button
                // onClick={() =>
                //   setShowChapters((prev) =>
                //     Math.max(1, prev - 1),
                //   )
                // }
                className="
                  px-3 py-1
                  rounded-lg
                  bg-secondary
                  hover:bg-secondary/60
                  transition-colors
                "
              >
                Назад
              </button>

              {/*<span
                className="
                  px-3 py-1
                  text-muted-foreground
                "
              >
                {Math.min(
                  showChapters * 30,
                  sortedChapters.length,
                )}{" "}
                / {sortedChapters.length}
              </span>*/}

              {/*{hasMoreChapters && (
                <button
                  onClick={() =>
                    setShowChapters(
                      (prev) => prev + 1,
                    )
                  }
                  className="
                    px-3 py-1
                    rounded-lg
                    bg-secondary
                    hover:bg-secondary/60
                    transition-colors
                  "
                >
                  Далее
                </button>
              )}*/}
            </div>
          </div>

          <div>
            <div className="divide-y divide-border">
              {/*{visibleChapters.map(
                (chapter, index) => (
                  <button
                    key={chapter.id}
                    // onClick={() =>
                    //   handleChapterClick(
                    //     chapter,
                    //   )
                    // }
                    className="
                      w-full
                      flex
                      items-center
                      justify-between
                      rounded-none!
                      px-4 py-3
                      text-left
                      transition-all
                      hover:bg-secondary/60
                      first:rounded-t-xl
                      last:rounded-b-xl
                    "
                  >
                    <div
                      className="
                        flex items-center
                        gap-3
                        min-w-0
                      "
                    >
                      <div
                        className="
                          w-7 h-7
                          rounded-lg
                          flex
                          items-center
                          justify-center
                          text-xs
                          shrink-0
                        "
                      >
                        {index + 1}
                      </div>

                      <div className="truncate text-sm">
                        {chapter.title ||
                          `Глава ${
                            chapter.order + 1
                          }`}
                      </div>
                    </div>

                    <ChevronRight
                      size={16}
                      className="
                        shrink-0
                        transition-transform
                        text-muted-foreground
                      "
                    />
                  </button>
                ),
              )}*/}

              {/*{hasMoreChapters && (
                <button
                  onClick={() =>
                    setShowChapters(
                      (prev) => prev + 1,
                    )
                  }
                  className="
                    w-full
                    py-4
                    text-sm
                    text-muted-foreground
                    hover:bg-secondary/60
                    transition-colors
                  "
                >
                  Показать ещё {remainingChapters}{" "}
                  глав
                </button>
              )}*/}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
