import { Chapter } from "@/entities/book/book.type";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type Activity = {
  id: string;
  chapterIndex: number;
  elementIndex: number;
  element: ContentElement;
};

export type RestoredReaderActivity = {
  id: string;
  chapterIndex: number;
  anchorIndex: number;
  element: ContentElement;
};

export const useReader = (chapters: Chapter[]) => {
  const [chapterIndex, setChapterIndex] = useState(0);
  const [elementIndex, setElementIndex] = useState(0);
  const [activities, setActivities] = useState<Activity[]>([]);
  const pendingRestoreRef = useRef<{ chapterIndex: number; elementIndex: number } | null>(null);
  const [restoreRevision, setRestoreRevision] = useState(0);

  const currentChapter = chapters[chapterIndex];

  /**
   * Исходные элементы глав.
   * Упражнения сюда не добавляются.
   */
  const baseChapterElements = useMemo(
    () =>
      chapters.map(
        (chapter) => buildDocument(chapter.html).elements,
      ),
    [chapters],
  );

  /**
   * Собираем отображаемые элементы.
   *
   * elementIndex в Activity — позиция в исходной главе,
   * перед которой необходимо показать упражнение.
   */
  const chapterElements = useMemo(() => {
    return baseChapterElements.map((baseElements, cIndex) => {
      const chapterActivities = activities
        .filter((activity) => activity.chapterIndex === cIndex)
        .sort((a, b) => a.elementIndex - b.elementIndex);
      const activitiesByPosition = new Map<number, ContentElement[]>();
      for (const activity of chapterActivities) {
        const atPosition = activitiesByPosition.get(activity.elementIndex) ?? [];
        atPosition.push(activity.element);
        activitiesByPosition.set(activity.elementIndex, atPosition);
      }

      const result: ContentElement[] = [];

      for (let i = 0; i <= baseElements.length; i++) {
        result.push(...(activitiesByPosition.get(i) ?? []));

        if (i < baseElements.length) {
          result.push(baseElements[i]);
        }
      }

      return result;
    });
  }, [baseChapterElements, activities]);

  useEffect(() => {
    const pending = pendingRestoreRef.current;
    if (!pending) return;
    const targetElements = chapterElements[pending.chapterIndex] ?? [];
    setElementIndex(Math.max(0, Math.min(pending.elementIndex, Math.max(0, targetElements.length - 1))));
    pendingRestoreRef.current = null;
  }, [chapterElements, restoreRevision]);

  const elements = chapterElements[chapterIndex] ?? [];

  const currentElement = elements[elementIndex];

  const previousChapter =
    chapterIndex > 0 ? chapters[chapterIndex - 1] : undefined;

  const previousElements =
    chapterIndex > 0 ? chapterElements[chapterIndex - 1] ?? [] : [];

  const currentElements = useMemo(
    () => elements.slice(0, elementIndex + 1),
    [elements, elementIndex],
  );

  const completedPreviousElements = useMemo(
    () =>
      chapterElements
        .slice(0, chapterIndex)
        .flatMap((chapter, previousChapterIndex) =>
          chapter.map((element, previousElementIndex) => ({
            element,
            chapterIndex: previousChapterIndex,
            elementIndex: previousElementIndex,
          })),
        ),
    [chapterElements, chapterIndex],
  );

  const completedElements = useMemo(
    () => [
      ...completedPreviousElements,
      ...currentElements.map((element, index) => ({
        element,
        chapterIndex,
        elementIndex: index,
      })),
    ],
    [completedPreviousElements, currentElements, chapterIndex],
  );

  const previousElement =
    previousElements.length > 0
      ? previousElements[previousElements.length - 1]
      : undefined;

  /**
   * Добавляет упражнение перед элементом исходного документа.
   *
   * Важно: anchorIndex — индекс исходного элемента,
   * а не индекс элемента в отображаемом списке.
   */
  const addActivity = useCallback(
    (
      activity: ContentElement,
      anchorIndex: number,
      targetChapterIndex = chapterIndex,
    ) => {
      setActivities((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          chapterIndex: targetChapterIndex,
          elementIndex: anchorIndex,
          element: activity,
        },
      ]);
    },
    [chapterIndex],
  );

  const restoreActivities = useCallback((restored: RestoredReaderActivity[]) => {
    if (restored.length === 0) return;
    setActivities((current) => {
      const existingIds = new Set(current.map((activity) => activity.id));
      const additions = restored
        .filter((activity) => !existingIds.has(activity.id))
        .map((activity) => ({
          id: activity.id,
          chapterIndex: activity.chapterIndex,
          elementIndex: activity.anchorIndex,
          element: activity.element,
        }));
      return additions.length ? [...current, ...additions] : current;
    });
  }, []);

  const getBaseElementIndex = useCallback((targetChapterIndex: number, renderedIndex: number): number | null => {
    const element = chapterElements[targetChapterIndex]?.[renderedIndex];
    if (!element || activities.some((activity) => activity.chapterIndex === targetChapterIndex && activity.element === element)) return null;
    const baseIndex = baseChapterElements[targetChapterIndex]?.indexOf(element) ?? -1;
    return baseIndex >= 0 ? baseIndex : null;
  }, [activities, baseChapterElements, chapterElements]);

  const getElementKey = useCallback((targetChapterIndex: number, renderedIndex: number): string => {
    const element = chapterElements[targetChapterIndex]?.[renderedIndex];
    if (!element) return `${targetChapterIndex}:missing:${renderedIndex}`;
    const activity = activities.find((item) => item.chapterIndex === targetChapterIndex && item.element === element);
    if (activity) return activity.id;
    const baseIndex = baseChapterElements[targetChapterIndex]?.indexOf(element) ?? renderedIndex;
    return `${targetChapterIndex}:base:${baseIndex}`;
  }, [activities, baseChapterElements, chapterElements]);

  const getNewActivityIndex = useCallback((targetChapterIndex: number, sourceIndex: number): number => {
    const precedingActivities = activities.filter((activity) => activity.chapterIndex === targetChapterIndex && activity.elementIndex <= sourceIndex).length;
    return sourceIndex + precedingActivities;
  }, [activities]);

  const next = useCallback((): NavigationResult => {
    if (elementIndex < elements.length - 1) {
      const nextElementIndex = elementIndex + 1;

      return {
        type: "element",
        chapterIndex,
        elementIndex: nextElementIndex,
      };
    }

    if (chapterIndex < chapters.length - 1) {
      const completedChapterIndex = chapterIndex;

      return {
        type: "chapter_completed",
        chapterIndex: completedChapterIndex,
      };
    }

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

  const advance = useCallback((result: NavigationResult) => {
    if (result.type === "element") {
      setElementIndex(result.elementIndex);
    } else if (result.type === "chapter_completed") {
      setChapterIndex(result.chapterIndex + 1);
      setElementIndex(0);
    }
  }, []);

  const restorePosition = useCallback((targetChapterIndex: number, targetElementIndex: number) => {
    const safeChapterIndex = Math.max(0, Math.min(targetChapterIndex, chapters.length - 1));
    setChapterIndex(safeChapterIndex);
    pendingRestoreRef.current = { chapterIndex: safeChapterIndex, elementIndex: targetElementIndex };
    setRestoreRevision((revision) => revision + 1);
  }, [chapters.length]);

  return {
    currentChapter,
    currentChapterIndex: chapterIndex,

    currentElement,
    currentElementIndex: elementIndex,

    elements,
    allChapterElements: baseChapterElements,
    currentElements,

    previousChapter,
    previousChapterIndex: chapterIndex > 0 ? chapterIndex - 1 : null,
    previousElement,
    previousElements,

    completedElements,
    showElements: completedElements,

    next,
    advance,
    restorePosition,
    addActivity,
    restoreActivities,
    getBaseElementIndex,
    getElementKey,
    getNewActivityIndex,
  };
};
