import { useCallback, useEffect, useRef } from "react";
import { commands } from "@/shared/commands/bindings";
import { useReaderStore } from "../store/ReaderStore";
import { ContentElement, ParagraphElementType } from "../lib/paragraph";

export type SelectionPosition = {
  elementIndex: number;
  wordIndex: number;
};

type CompletedElement = {
  element: ContentElement;
  elementIndex: number;
};

const isParagraphElement = (
  element: ContentElement,
): element is ParagraphElementType => {
  return element.type === "paragraph";
};

const parsePosition = (
  value: string | null,
): SelectionPosition | null => {
  if (!value) {
    return null;
  }

  const [elementIndexRaw, wordIndexRaw] = value.split("-");

  const elementIndex = Number(elementIndexRaw);
  const wordIndex = Number(wordIndexRaw);

  if (
    !Number.isInteger(elementIndex) ||
    !Number.isInteger(wordIndex)
  ) {
    return null;
  }

  return {
    elementIndex,
    wordIndex,
  };
};

const formatPosition = (
  position: SelectionPosition,
): string => {
  return `${position.elementIndex}-${position.wordIndex}`;
};

const getSelectedText = (
  elements: CompletedElement[],
  start: SelectionPosition,
  end: SelectionPosition,
): string | null => {
  let startPosition = start;
  let endPosition = end;

  /**
   * Если пользователь выделил справа налево,
   * меняем начало и конец местами.
   */
  if (
    startPosition.elementIndex > endPosition.elementIndex ||
    (
      startPosition.elementIndex === endPosition.elementIndex &&
      startPosition.wordIndex > endPosition.wordIndex
    )
  ) {
    [startPosition, endPosition] = [
      endPosition,
      startPosition,
    ];
  }

  /**
   * Один paragraph.
   */
  if (
    startPosition.elementIndex === endPosition.elementIndex
  ) {
    const item = elements[startPosition.elementIndex];

    if (!item || !isParagraphElement(item.element)) {
      return null;
    }

    const words = item.element.text.split(/\s+/);

    return words
      .slice(
        startPosition.wordIndex,
        endPosition.wordIndex + 1,
      )
      .join(" ");
  }

  /**
   * Первый paragraph.
   */
  const first = elements[startPosition.elementIndex];

  if (!first || !isParagraphElement(first.element)) {
    return null;
  }

  const firstWords = first.element.text.split(/\s+/);

  const firstText = firstWords
    .slice(startPosition.wordIndex)
    .join(" ");

  /**
   * Последний paragraph.
   */
  const last = elements[endPosition.elementIndex];

  if (!last || !isParagraphElement(last.element)) {
    return null;
  }

  const lastWords = last.element.text.split(/\s+/);

  const lastText = lastWords
    .slice(0, endPosition.wordIndex + 1)
    .join(" ");

  /**
   * Paragraphs между началом и концом.
   */
  const middleText = elements
    .slice(
      startPosition.elementIndex + 1,
      endPosition.elementIndex,
    )
    .filter(({ element }) => isParagraphElement(element))
    .map(({ element }) => (element as any).text.split(/\s+/).join(" "))
    .join(" ");

  return [
    firstText,
    middleText,
    lastText,
  ]
    .filter(Boolean)
    .join(" ");
};

export const useReaderSelection = (
  completedElements: CompletedElement[],
) => {
  const selectedStart = useReaderStore(
    (state) => state.selectedStart,
  );

  const selectedEnd = useReaderStore(
    (state) => state.selectedEnd,
  );

  const setSelectedStart = useReaderStore(
    (state) => state.setSelectedStart,
  );

  const setSelectedEnd = useReaderStore(
    (state) => state.setSelectedEnd,
  );

  const setTranslation = useReaderStore(
    (state) => state.setTranslation,
  );

  /**
   * Реальная позиция начала выделения.
   *
   * Ref нужен потому, что Zustand state обновляется
   * не синхронно с mouse event.
   */
  const selectionStartRef =
    useRef<SelectionPosition | null>(null);

  const isSelectingRef = useRef(false);

  /**
   * Начало выделения.
   */
  const startSelection = useCallback(
    (elementIndex: number, wordIndex: number) => {
      const position = {
        elementIndex,
        wordIndex,
      };

      selectionStartRef.current = position;
      isSelectingRef.current = false;

      setSelectedStart(formatPosition(position));
      setSelectedEnd(formatPosition(position));
    },
    [
      setSelectedStart,
      setSelectedEnd,
    ],
  );

  /**
   * Наведение на слово во время drag selection.
   */
  const updateSelection = useCallback(
    (elementIndex: number, wordIndex: number) => {
      const start = selectionStartRef.current;

      if (!start) {
        return;
      }

      const end = {
        elementIndex,
        wordIndex,
      };

      if (
        start.elementIndex !== end.elementIndex ||
        start.wordIndex !== end.wordIndex
      ) {
        isSelectingRef.current = true;
      }

      setSelectedEnd(formatPosition(end));
    },
    [setSelectedEnd],
  );

  /**
   * Завершение выделения.
   *
   * Возвращает true, если был selection,
   * false — если это обычный клик по слову.
   */
  const finishSelection = useCallback(
    (elementIndex: number, wordIndex: number) => {
      const start = selectionStartRef.current;

      if (!start) {
        return false;
      }

      const end = {
        elementIndex,
        wordIndex,
      };

      const wasSelecting = isSelectingRef.current;

      if (wasSelecting) {
        setSelectedEnd(formatPosition(end));
      } else {
        setSelectedStart(null);
        setSelectedEnd(null);
      }

      selectionStartRef.current = null;
      isSelectingRef.current = false;

      return wasSelecting;
    },
    [
      setSelectedStart,
      setSelectedEnd,
    ],
  );

  /**
   * Нужно ли считать слово частью текущего selection.
   */
  const isSelected = useCallback(
    (elementIndex: number, wordIndex: number) => {
      if (!selectedStart || !selectedEnd) {
        return false;
      }

      const [startChapter, startWord] = selectedStart.split("-").map(Number);
      const [endChapter, endWord] = selectedEnd.split("-").map(Number);

      const positionChapter = elementIndex;
      const positionWord = wordIndex;

      const isAfterStart =
        positionChapter > startChapter ||
        (positionChapter === startChapter && positionWord >= startWord);

      const isBeforeEnd =
        positionChapter < endChapter ||
        (positionChapter === endChapter && positionWord <= endWord);

      return isAfterStart && isBeforeEnd;
    },
    [selectedStart, selectedEnd],
  );

  /**
   * Перевод текущего выделения.
   */
  useEffect(() => {
    const start = parsePosition(selectedStart);
    const end = parsePosition(selectedEnd);

    if (!start || !end) {
      return;
    }

    const text = getSelectedText(
      completedElements,
      start,
      end,
    );

    if (!text) {
      return;
    }

    let cancelled = false;

    const translate = async () => {
      const result = await commands.translate(
        "en",
        "ru",
        text,
      );

      if (
        cancelled ||
        result.status === "error"
      ) {
        return;
      }

      setTranslation(result.data);
    };

    translate();

    return () => {
      cancelled = true;
    };
  }, [
    selectedStart,
    selectedEnd,
    completedElements,
    setTranslation,
  ]);

  return {
    selectedStart,
    selectedEnd,

    startSelection,
    updateSelection,
    finishSelection,

    isSelected,
  };
};
