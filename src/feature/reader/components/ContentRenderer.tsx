import { useReaderSelection } from "../hooks/useReaderSelection";
import { ContentElement } from "../lib/paragraph";
import { CodeElement } from "./CodeElement";
import { HeadingElement } from "./HeadingElement";
import { ParagraphElement } from "./ParagraphElement";
import { QuestionElement } from "./QuestionElement";

export const ContentRenderer = ({
  element,
  selection
}: {
    element: ContentElement;
  selection: ReturnType<typeof useReaderSelection>;
}) => {
  switch (element.type) {
    case "paragraph":
      return <ParagraphElement element={element} selection={selection} />;

    case "question":
      return <QuestionElement element={element} />;

    case "code":
      return <CodeElement element={element} />;

    case "heading":
      return <HeadingElement element={element} />;
  }
};
