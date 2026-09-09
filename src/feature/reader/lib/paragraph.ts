export type ParagraphType = "paragraph" | "heading" | "question" | "code";

export type ParagraphQuestion = {
  question: string;
  answer: string;
}

export type ContentElement =
  | ParagraphElementType
  | HeadingElementType
  | QuestionElementType
  | CodeElementType;

export type ParagraphElementType = {
  type: "paragraph";
  text: string;
};

export type HeadingElementType = {
  type: "heading";
  level: 1 | 2 | 3;
  text: string;
};

export type QuestionElementType = {
  type: "question";
  questions: ParagraphQuestion[];
  right: number;
  label: string;
  description: string;
};

export type CodeElementType = {
  type: "code";
  language?: string;
  code: string;
};

export type Document = {
  id: string;
  elements: ContentElement[];
};

export const buildDocument = (text: string): Document => {
  const paragraphs = splitIntoParagraphs(text);

  const elements: ContentElement[] = [];

  for (const paragraph of paragraphs) {
    elements.push({
      id: crypto.randomUUID(),
      type: "paragraph",
      text: paragraph,
    });
  }

  return {
    id: crypto.randomUUID(),
    elements,
  };
};

export const splitIntoParagraphs = (text: string): string[] => {
  const doc = new DOMParser().parseFromString(text, "text/html");

  const paragraphs = Array.from(doc.querySelectorAll("p")).map(
    (p) => p.textContent?.trim() ?? ""
  );

  return paragraphs;
};
