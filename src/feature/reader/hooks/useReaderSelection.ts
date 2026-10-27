import {
  useCallback,
  useMemo,
  useRef,
} from "react";

import {
  ContentElement,
  ParagraphElementType,
} from "../lib/paragraph";

import {
  extractWordsFromHtml,
} from "./useWordWrappedHtml";

import { useReaderStore } from "../store/ReaderStore";

import {
  useTranslationStore,
} from "../store/TranslationStore";

export type SelectionPosition = {
  chapterIndex: number;
  elementIndex: number;
  wordIndex: number;
};

export type CompletedElement = {
  element: ContentElement;
  chapterIndex: number;
  elementIndex: number;
};

const isParagraphElement = (
  element: ContentElement,
): element is ParagraphElementType => {
  return element.type === "paragraph";
};

export const getReaderWordId = (
  position: SelectionPosition,
): string => {
  return [
    "reader-word",
    position.chapterIndex,
    position.elementIndex,
    position.wordIndex,
  ].join("-");
};

const comparePositions = (
  a: SelectionPosition,
  b: SelectionPosition,
): number => {
  if (
    a.chapterIndex !==
    b.chapterIndex
  ) {
    return (
      a.chapterIndex -
      b.chapterIndex
    );
  }

  if (
    a.elementIndex !==
    b.elementIndex
  ) {
    return (
      a.elementIndex -
      b.elementIndex
    );
  }

  return (
    a.wordIndex -
    b.wordIndex
  );
};

const normalizeRange = (
  start: SelectionPosition,
  end: SelectionPosition,
): [
  SelectionPosition,
  SelectionPosition,
] => {
  if (
    comparePositions(start, end) <= 0
  ) {
    return [start, end];
  }

  return [end, start];
};

const getElementWords = (
  element: ContentElement,
) => {
  if (!isParagraphElement(element)) {
    return [];
  }

  let words = wordsByElement.get(element);
  if (!words) {
    words = extractWordsFromHtml(element.text);
    wordsByElement.set(element, words);
  }
  return words;
};

// Paragraph objects are stable for the lifetime of a parsed chapter.
const wordsByElement = new WeakMap<ContentElement, string[]>();

const getRangeIds = (
  elements: CompletedElement[],
  start: SelectionPosition,
  end: SelectionPosition,
): string[] => {
  const [
    rangeStart,
    rangeEnd,
  ] = normalizeRange(start, end);

  const result: string[] = [];

  for (const item of elements) {
    const elementPosition: SelectionPosition =
      {
        chapterIndex:
          item.chapterIndex,
        elementIndex:
          item.elementIndex,
        wordIndex: 0,
      };

    const elementEndPosition: SelectionPosition =
      {
        chapterIndex:
          item.chapterIndex,
        elementIndex:
          item.elementIndex,
        wordIndex: Number.MAX_SAFE_INTEGER,
      };

    /*
     * Элемент находится до диапазона.
     */
    if (
      comparePositions(
        elementEndPosition,
        rangeStart,
      ) < 0
    ) {
      continue;
    }

    /*
     * Элемент находится после диапазона.
     */
    if (
      comparePositions(
        elementPosition,
        rangeEnd,
      ) > 0
    ) {
      continue;
    }

    const words =
      getElementWords(
        item.element,
      );

    if (!words.length) {
      continue;
    }

    let from = 0;
    let to =
      words.length - 1;

    if (
      item.chapterIndex ===
        rangeStart.chapterIndex &&
      item.elementIndex ===
        rangeStart.elementIndex
    ) {
      from = Math.max(
        0,
        Math.min(
          rangeStart.wordIndex,
          words.length - 1,
        ),
      );
    }

    if (
      item.chapterIndex ===
        rangeEnd.chapterIndex &&
      item.elementIndex ===
        rangeEnd.elementIndex
    ) {
      to = Math.max(
        0,
        Math.min(
          rangeEnd.wordIndex,
          words.length - 1,
        ),
      );
    }

    if (from > to) {
      continue;
    }

    for (
      let wordIndex = from;
      wordIndex <= to;
      wordIndex++
    ) {
      result.push(
        getReaderWordId({
          chapterIndex:
            item.chapterIndex,
          elementIndex:
            item.elementIndex,
          wordIndex,
        }),
      );
    }
  }

  return result;
};

const getSelectedText = (
  elements: CompletedElement[],
  selectedIds: string[],
): string | null => {
  if (!selectedIds.length) {
    return null;
  }

  const wordsById =
    new Map<string, string>();
  const remainingIds = new Set(selectedIds);

  for (const item of elements) {
    if (remainingIds.size === 0) break;

    const words =
      getElementWords(
        item.element,
      );

    for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
      const id =
        getReaderWordId({
          chapterIndex:
            item.chapterIndex,
          elementIndex:
            item.elementIndex,
          wordIndex,
        });

      if (remainingIds.delete(id)) {
        wordsById.set(id, words[wordIndex]);
      }
    }
  }

  const text = selectedIds
    .map((id) =>
      wordsById.get(id),
    )
    .filter(
      (
        word,
      ): word is string =>
        Boolean(word),
    )
    .join(" ");

  return text || null;
};

export const useReaderSelection = (
  completedElements: CompletedElement[],
) => {
  const selectedIds =
    useReaderStore(
      (state) =>
        state.selectedIds,
    );
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

  const setSelectedIds =
    useReaderStore(
      (state) =>
        state.setSelectedIds,
    );

  const closePopup =
    useTranslationStore(
      (state) => state.close,
    );

  const selectionStartRef =
    useRef<SelectionPosition | null>(
      null,
    );

  const isSelectingRef =
    useRef(false);

  const startSelection =
    useCallback(
      (
        chapterIndex: number,
        elementIndex: number,
        wordIndex: number,
      ) => {
        const position: SelectionPosition =
          {
            chapterIndex,
            elementIndex,
            wordIndex,
          };

        selectionStartRef.current =
          position;

        isSelectingRef.current =
          false;

        setSelectedIds([
          getReaderWordId(position),
        ]);

        closePopup();
      },
      [
        setSelectedIds,
        closePopup,
      ],
    );

  const updateSelection =
    useCallback(
      (
        chapterIndex: number,
        elementIndex: number,
        wordIndex: number,
      ) => {
        const start =
          selectionStartRef.current;

        if (!start) {
          return;
        }

        const end: SelectionPosition = {
          chapterIndex,
          elementIndex,
          wordIndex,
        };

        if (
          comparePositions(
            start,
            end,
          ) !== 0
        ) {
          isSelectingRef.current =
            true;
        }

        const ids =
          getRangeIds(
            completedElements,
            start,
            end,
          );

        setSelectedIds(ids);
      },
      [
        completedElements,
        setSelectedIds,
      ],
    );

  const finishSelection =
    useCallback(
      (
        chapterIndex: number,
        elementIndex: number,
        wordIndex: number,
      ) => {
        const start =
          selectionStartRef.current;

        if (!start) {
          return null;
        }

        const end: SelectionPosition = {
          chapterIndex,
          elementIndex,
          wordIndex,
        };

        const wasSelecting =
          isSelectingRef.current;

        selectionStartRef.current = null;
        isSelectingRef.current = false;

        if (!wasSelecting) {
          setSelectedIds([]);
          closePopup();

          return {
            type: "word" as const,
          };
        }

        const [
          rangeStart,
          rangeEnd,
        ] = normalizeRange(
          start,
          end,
        );

        const ids =
          getRangeIds(
            completedElements,
            rangeStart,
            rangeEnd,
          );

        const text =
          getSelectedText(
            completedElements,
            ids,
          );

        setSelectedIds(ids);

        if (!text) {
          return null;
        }

        return {
          type: "selection" as const,
          start: rangeStart,
          end: rangeEnd,
          text,
          ids,
        };
      },
      [
        completedElements,
        setSelectedIds,
        closePopup,
      ],
    );

  const isSelected = useCallback(
    (id: string) => {
      return selectedIdsRef.current.includes(id);
    },
    [],
  );

  const isSelectionStarted =
    useCallback(() => {
      return (
        selectionStartRef.current !== null
      );
    }, []);

  return useMemo(() => ({
    startSelection,
    updateSelection,
    finishSelection,
    isSelected,
    isSelectionStarted,
  }), [startSelection, updateSelection, finishSelection, isSelected, isSelectionStarted]);
};
