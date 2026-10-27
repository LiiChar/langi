import { useReaderSelection } from "../../hooks/useReaderSelection";
import { renderHtmlWithWords, type ReaderWord as HtmlReaderWord } from "../../lib/html";
import { ParagraphElementType } from "../../lib/paragraph";
import { ReaderWord } from "./ReaderWord";
import { memo, useMemo } from "react";

type ParagraphElementProps = {
  element: ParagraphElementType;
  selection: ReturnType<typeof useReaderSelection>;
  chapterIndex: number;
  elementIndex: number;
};

export const ParagraphElement = memo(({
  element,
  selection,
  chapterIndex,
  elementIndex,
}: ParagraphElementProps) => {
  const content = useMemo(() => renderHtmlWithWords(
    element.text,
    (word: HtmlReaderWord) => (
      <ReaderWord
        key={word.index}
        word={word}
        chapterIndex={chapterIndex}
        elementIndex={elementIndex}
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
});
