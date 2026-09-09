import { ContentElement } from "../lib/paragraph";
import { CodeElement } from "./CodeElement";
import { HeadingElement } from "./HeadingElement";
import { ParagraphElement } from "./ParagraphElement";
import { QuestionElement } from "./QuestionElement";

export const ContentRenderer = ({
  element,
}: {
  element: ContentElement;
}) => {
  switch (element.type) {
    case "paragraph":
      return <ParagraphElement element={element} />;

    case "question":
      return <QuestionElement element={element} />;

    case "code":
      return <CodeElement element={element} />;

    case "heading":
      return <HeadingElement element={element} />;
  }
};
