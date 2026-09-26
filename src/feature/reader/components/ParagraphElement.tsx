import {
  renderHtmlWithWords,
  type ReaderWord as HtmlReaderWord,
} from "../lib/html";

import { ParagraphElementType } from "../lib/paragraph";
import type { useReaderSelection } from "../hooks/useReaderSelection";
import { ReaderWord } from "./ReaderWord";

type ParagraphElementProps = {
  element: ParagraphElementType;
  selection: ReturnType<typeof useReaderSelection>;
  chapterIndex: number;
  elementIndex: number;
};

export const ParagraphElement = ({
  element,
  selection,
  chapterIndex,
  elementIndex,
}: ParagraphElementProps) => {
  const content = renderHtmlWithWords(
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
  );

  return (
    <div
      data-reader-element-index={element.index}
      className="
        w-full
        rounded-md
        transition-colors
        duration-200
        hover:bg-primary/10
        has-[span[data-word-index]:hover]:bg-transparent
      "
    >
      {content}
    </div>
  );
};
