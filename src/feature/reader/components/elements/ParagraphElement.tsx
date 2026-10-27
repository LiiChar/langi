import { useReaderSelection } from "../../hooks/useReaderSelection";
import type { ReaderElementPosition } from "../../hooks/useReaderSelection";
import { renderHtmlWithWords, type ReaderWord as HtmlReaderWord } from "../../lib/html";
import { ParagraphElementType } from "../../lib/paragraph";
import { ReaderWord } from "./ReaderWord";
import { memo, useMemo } from "react";

type ParagraphElementProps = {
  element: ParagraphElementType;
  selection: ReturnType<typeof useReaderSelection>;
  position: ReaderElementPosition;
};

export const ParagraphElement = memo(({
  element,
  selection,
  position,
}: ParagraphElementProps) => {
  const { chapterIndex, elementIndex } = position;
  const content = useMemo(() => renderHtmlWithWords(
    element.text,
    (word: HtmlReaderWord) => (
      <ReaderWord
        key={word.index}
        word={word}
        position={position}
        selection={selection}
      />
    ),
  ), [element.text, selection, chapterIndex, elementIndex]);

  return (
    <div
      data-reader-element-index={element.index}
      className="
        w-full
        rounded-md
        transition-colors
        duration-200
      "
    >
      {content}
    </div>
  );
}, (previous, next) =>
  previous.element === next.element &&
  previous.selection === next.selection &&
  previous.position.chapterIndex === next.position.chapterIndex &&
  previous.position.elementIndex === next.position.elementIndex,
);
