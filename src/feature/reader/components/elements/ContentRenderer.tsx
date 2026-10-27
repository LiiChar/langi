
import { useReaderSelection } from "../../hooks/useReaderSelection";
import type { ReaderElementPosition } from "../../hooks/useReaderSelection";
import type { ContentElement } from "../../lib/paragraph";
import { CodeElement } from "./CodeElement";
import { HeadingElement } from "./HeadingElement";
import { ParagraphElement } from "./ParagraphElement";
import { QuestionElement } from "./QuestionElement";
import { ReviewWordElement } from "./ReviewWordElement";
import { ReviewWordsElement } from "./ReviewWordsElement";
import { SentenceElement } from "./SentenceElement";
import { memo } from "react";

export type ContentRendererProps = {
  element: ContentElement;
  position: ReaderElementPosition;
  selection: ReturnType<typeof useReaderSelection>;
};

export const ContentRenderer = memo(({
  element,
  position,
  selection,
}: ContentRendererProps) => {
  const content = (() => { switch (element.type) {
    case "paragraph":
      return (
        <ParagraphElement
          element={element}
          selection={selection}
          position={position}
        />
      );

    case "heading":
      return <HeadingElement element={element} />;

    case "question":
      return <QuestionElement element={element} />;

    case "review-word":
      return <ReviewWordElement element={element} />;

    case "review-words":
      return <ReviewWordsElement element={element} />;

    case "sentence":
      return <SentenceElement element={element} />;

    case "code":
      return <CodeElement element={element} />;

    default:
      return null;
  }})();

  return <div className="select-text" data-reader-content={`${position.chapterIndex}-${position.elementIndex}`}>{content}</div>;
}, (previous, next) =>
  previous.element === next.element &&
  previous.selection === next.selection &&
  previous.position.chapterIndex === next.position.chapterIndex &&
  previous.position.elementIndex === next.position.elementIndex,
);
