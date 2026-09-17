import { Chapter } from "@/entities/book/book.type";
import { useCallback, useMemo, useState } from "react";
import { buildDocument, ContentElement } from "../lib/paragraph";

export type NavigationResult =
  | {
      type: "element";
      chapterIndex: number;
      elementIndex: number;
    }
  | {
      type: "chapter_completed";
      chapterIndex: number;
    }
  | {
      type: "book_completed";
      chapterIndex: number;
    };

export type VisibleElement = {
  element: ContentElement;
  chapterIndex: number;
  elementIndex: number;
};

export const useReader = (chapters: Chapter[]) => {
  const [chapterIndex, setChapterIndex] = useState(0);
  const [elementIndex, setElementIndex] = useState(0);

  /**
   * Индекс текущей главы.
   */
  const currentChapter = chapters[chapterIndex];

  /**
   * Элементы всех глав.
   *
   * Это вычисляемое значение, поэтому никакого дополнительного
   * состояния для них не требуется.
   */
  const chapterElements = useMemo(() => {
    return chapters.map((chapter) => buildDocument(chapter.html).elements);
  }, [chapters]);

  /**
   * Элементы текущей главы.
   */
  const elements = chapterElements[chapterIndex] ?? [];

  /**
   * Текущий элемент.
   */
  const currentElement = elements[elementIndex];

  /**
   * Предыдущая глава.
   */
  const previousChapter =
    chapterIndex > 0
      ? chapters[chapterIndex - 1]
      : undefined;

  /**
   * Элементы предыдущей главы.
   */
  const previousElements =
    chapterIndex > 0
      ? chapterElements[chapterIndex - 1] ?? []
      : [];

  /**
   * Все элементы текущей главы, которые уже были пройдены.
   *
   * Текущий элемент тоже считается пройденным.
   */
  const currentElements = useMemo(() => {
    return elements.slice(0, elementIndex + 1);
  }, [elements, elementIndex]);

  /**
   * Все элементы из предыдущих глав.
   *
   * Они полностью пройдены, потому что пользователь уже
   * перешёл в текущую главу.
   */
  const completedPreviousElements = useMemo(() => {
    return chapterElements
      .slice(0, chapterIndex)
      .flatMap((chapterElements, previousChapterIndex) =>
        chapterElements.map((element, previousElementIndex) => ({
          element,
          chapterIndex: previousChapterIndex,
          elementIndex: previousElementIndex,
        })),
      );
  }, [chapterElements, chapterIndex]);

  /**
   * Все элементы, которые пользователь уже прошёл.
   *
   * Например:
   *
   * Глава 0:
   *   [0, 1, 2, 3]
   *
   * Глава 1:
   *   [0, 1, 2]
   *
   * Текущий элемент = 2
   *
   * Результат:
   *   глава 0 -> 0, 1, 2, 3
   *   глава 1 -> 0, 1, 2
   */
  const completedElements = useMemo(() => {
    return [
      ...completedPreviousElements,
      ...currentElements.map((element, index) => ({
        element,
        chapterIndex,
        elementIndex: index,
      })),
    ];
  }, [
    completedPreviousElements,
    currentElements,
    chapterIndex,
  ]);

  /**
   * Последний элемент предыдущей главы.
   */
  const previousElement =
    previousElements.length > 0
      ? previousElements[previousElements.length - 1]
      : undefined;

  /**
   * Переход к следующему элементу.
   */
  const next = useCallback((): NavigationResult => {
    /**
     * В текущей главе есть ещё элементы.
     */
    if (elementIndex < elements.length - 1) {
      const nextElementIndex = elementIndex + 1;

      setElementIndex(nextElementIndex);

      return {
        type: "element",
        chapterIndex,
        elementIndex: nextElementIndex,
      };
    }

    /**
     * Текущая глава закончилась.
     */
    if (chapterIndex < chapters.length - 1) {
      const completedChapterIndex = chapterIndex;
      const nextChapterIndex = chapterIndex + 1;

      setChapterIndex(nextChapterIndex);
      setElementIndex(0);

      return {
        type: "chapter_completed",
        chapterIndex: completedChapterIndex,
      };
    }

    /**
     * Закончилась вся книга.
     */
    return {
      type: "book_completed",
      chapterIndex,
    };
  }, [
    chapterIndex,
    elementIndex,
    elements.length,
    chapters.length,
  ]);

  return {
    // -------------------------
    // Current chapter
    // -------------------------

    currentChapter,
    currentChapterIndex: chapterIndex,

    // -------------------------
    // Current element
    // -------------------------

    currentElement,
    currentElementIndex: elementIndex,

    // -------------------------
    // Current chapter content
    // -------------------------

    elements,
    currentElements,

    // -------------------------
    // Previous chapter
    // -------------------------

    previousChapter,

    previousChapterIndex:
      chapterIndex > 0
        ? chapterIndex - 1
        : null,

    previousElement,
    previousElements,

    // -------------------------
    // Progress
    // -------------------------

    /**
     * Все элементы, которые пользователь уже прошёл.
     */
    completedElements,

    /**
     * Алиас, если старый код использует showElements.
     */
    showElements: completedElements,

    // -------------------------
    // Navigation
    // -------------------------

    next,
  };
};
