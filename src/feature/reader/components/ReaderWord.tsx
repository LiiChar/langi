import type {
  useReaderSelection,
} from "../hooks/useReaderSelection";

import {
  getReaderWordId,
} from "../hooks/useReaderSelection";

import {
  useReaderTranslation,
} from "../hooks/useReaderTranslation";

import {
  ReaderWord as HtmlReaderWord,
} from "../lib/html";

import {
  translationPopover,
} from "./TranslationPopover";

import { Popover } from "@base-ui/react";

type ReaderWordProps = {
  word: HtmlReaderWord;

  chapterIndex: number;
  elementIndex: number;

  selection: ReturnType<
    typeof useReaderSelection
  >;
};

export const ReaderWord = ({
  word,
  chapterIndex,
  elementIndex,
  selection,
}: ReaderWordProps) => {
  const { translate } =
    useReaderTranslation();

  const wordId =
    getReaderWordId({
      chapterIndex,
      elementIndex,
      wordIndex: word.index,
    });

  const isSelected =
    selection.isSelected(wordId);

  const handleMouseDown = (
    event: React.MouseEvent<HTMLSpanElement>,
  ) => {
    event.preventDefault();

    selection.startSelection(
      chapterIndex,
      elementIndex,
      word.index,
    );
  };

  const handleMouseEnter = () => {
    if (
      selection.isSelectionStarted()
    ) {
      selection.updateSelection(
        chapterIndex,
        elementIndex,
        word.index,
      );
    }
  };

  const handleMouseUp = (
    event: React.MouseEvent<HTMLSpanElement>,
  ) => {
    event.preventDefault();

    const result =
      selection.finishSelection(
        chapterIndex,
        elementIndex,
        word.index,
      );

    if (!result) {
      return;
    }

    if (result.type === "selection") {
      void translate({
        type: "selection",
        start: result.start,
        end: result.end,
        text: result.text,
      });

      requestAnimationFrame(() => {
        translationPopover.open(wordId);
      });

      return;
    }

    translationPopover.open(
      wordId,
    );

    void translate({
      type: "word",
      position: {
        chapterIndex,
        elementIndex,
        wordIndex: word.index,
      },
      text: word.text,
    });
  };


  return (
    <Popover.Trigger
      id={wordId}
      handle={translationPopover}
      nativeButton={false}
      render={
        <span
          data-reader-word-id={wordId}
          data-word-index={word.index}
          data-word={word.text}
          data-reader-word-chapter-index={
            chapterIndex
          }
          data-reader-word-element-index={
            elementIndex
          }
          data-reader-word-index={
            word.index
          }
          data-translation-word
          className={[
            "inline-block",
            "select-none",
            "cursor-pointer",
            "border-b",
            "border-dashed",
            "border-foreground/50",
            "outline-none",
            "transition-all",
            "duration-100",
            "hover:bg-primary/20",
            "hover:rounded-sm",
            "hover:border-foreground/70",

            isSelected
              ? "bg-primary/25 border-primary/60 rounded-sm"
              : "",
          ].join(" ")}
          onMouseDown={
            handleMouseDown
          }
          onMouseEnter={
            handleMouseEnter
          }
          onMouseUp={
            handleMouseUp
          }
        >
          {word.text}
        </span>
      }
    />
  );
};