import { useReaderSelection } from "../hooks/useReaderSelection";
import { ContentElement } from "../lib/paragraph";
import { CodeElement } from "./CodeElement";
import { HeadingElement } from "./HeadingElement";
import { ParagraphElement } from "./ParagraphElement";
import { QuestionElement } from "./QuestionElement";

export type ContentRendererProps = {
  element: ContentElement;
  chapterIndex: number;
  elementIndex: number;
  selection: ReturnType<
    typeof useReaderSelection
  >;
};

export const ContentRenderer = ({
  element,
  chapterIndex,
  elementIndex, 
  selection
}: ContentRendererProps) => {
  switch (element.type) {
    case "paragraph":
      return <ParagraphElement element={element} selection={selection} chapterIndex={chapterIndex} elementIndex={elementIndex} />;

    case "question":
      return <QuestionElement element={element} />;

    case "code":
      return <CodeElement element={element} />;

    case "heading":
      return <HeadingElement element={element} />;
  }
};
