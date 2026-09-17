import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useReader } from "../hooks/useReader";
import { useCallback, useEffect, useRef } from "react";
import { ContentRenderer } from "../components/ContentRenderer";
import { events, LearningEventData, LearningEventType } from "@/shared/commands/bindings";
import { useAutoScroll } from "#hooks/index";
import { useReaderStore } from "../store/ReaderStore";
import { useReaderSelection } from "../hooks/useReaderSelection";
import { convertBook } from "@/shared/commands/import";
import { Button } from "#ui/button";

export const ReaderPage = () => {
  const routeApi = getRouteApi("/book/$bookId/read/");
  const navigate = useNavigate();

  const data = routeApi.useLoaderData();

  const sessionStartedAt = useRef(Date.now());
  const previousChapterId = useRef<string | null>(null);
  const seenParagraphs = useRef<Set<string>>(new Set());

  const setStoreBook = useReaderStore((state) => state.setBook);

  if (data.status === "error") {
    navigate({ to: "/" });
    return null;
  }

  const book = convertBook(data.data);

  if (book.chapters == null) {
    navigate({ to: "/" });
    return null;
  }

  const {
    currentChapter,
    currentChapterIndex,
    currentElement,
    currentElementIndex,
    completedElements,
    next,
  } = useReader(book.chapters);

  const selection = useReaderSelection(
    completedElements,
  );

  const ref = useAutoScroll<HTMLDivElement>();

  /**
   * Отправка события.
   *
   * Здесь можно заменить реализацию на твой event API.
   */
  const emitLearningEvent = (
    eventType: LearningEventType,
    payload: LearningEventData,
  ) => {

    events.learningEvent.emit({
      id: crypto.randomUUID(),
      user_id: "0",
      event_type: eventType,
      timestamp: Date.now(),
      context: {
        book_id: book.id,
        chapter_id: currentChapter.id,
        element_id: currentChapter.id + "-" + currentChapterIndex,
        exercise_id: null,
        question_id: null,
        skill_id: null,
        word_id: null
      },
      data: payload,
    });

    console.debug("[learning]", {
      eventType,
      bookId: book.id,
      chapterId: currentChapter.id,
      elementId: currentChapter.id + "-" + currentChapterIndex,
      payload,
    });
  };

  /**
   * Reading session started.
   */
  useEffect(() => {
    setStoreBook(book);
    sessionStartedAt.current = Date.now();

    emitLearningEvent("ReadingSessionStarted", "Empty");

    return () => {
      const durationSeconds = Math.floor(
        (Date.now() - sessionStartedAt.current) / 1000,
      );

      emitLearningEvent("ReadingSessionFinished", {
        ReadingSession: {
          seconds: durationSeconds,
          paragraphs_seen: seenParagraphs.current.size,
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!currentChapter) {
      return;
    }

    if (previousChapterId.current === currentChapter.id) {
      return;
    }

    previousChapterId.current = currentChapter.id;

    emitLearningEvent("ChapterOpened", "Empty");
  }, [currentChapter]);

  /**
   * Paragraph seen.
   */
  useEffect(() => {
    if (!currentElement) {
      return;
    }

    const elementId =
      `${currentChapter.id}-${currentElementIndex}`;

    if (seenParagraphs.current.has(elementId)) {
      return;
    }

    seenParagraphs.current.add(elementId);

    emitLearningEvent("ParagraphSeen", "Empty");
  }, [
    currentElement,
    currentChapter.id,
    currentElementIndex,
  ]);

  const onNextHandler = useCallback(() => {
    const result = next();
    console.log(result);
    switch (result.type) {
      case "element":
        break;

      case "chapter_completed":
        emitLearningEvent("ChapterCompleted", "Empty");
        break;

      case "book_completed":
        // здесь уже решаешь, что делать после последнего элемента книги
        break;
    }
  }, [next, currentChapter.id, currentChapterIndex]);

  return (
    <div className="flex gap-1 h-full flex-col relative">
      <div
        className="p-4 flex h-full justify-center items-center window"
        ref={ref}
      >
        <div className="w-[90%] h-full">
          <div className="flex flex-col gap-1">
            {completedElements.slice(0, -1).map((element) => (
              <ContentRenderer
                element={element.element}
                key={element.chapterIndex + "-" + element.elementIndex}
                selection={selection}
              />
            ))}
            <div className="">
              {completedElements.slice(-1).map((element) => (
                <ContentRenderer
                  element={element.element}
                  key={element.chapterIndex + "-" + element.elementIndex}
                  selection={selection}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

        <Button onClick={onNextHandler} className="absolute bottom-2 right-3 rounded-md!">
          Продолжить
        </Button>
    </div>
  );
};
