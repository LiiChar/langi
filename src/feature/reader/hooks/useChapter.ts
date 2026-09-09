import { Chapter } from "@/entities/book/book.type";
import { useCallback, useMemo, useState } from "react";
import { buildDocument } from "../lib/paragraph";

export const useChapter = (chapter: Chapter) => {
  const paragraphs = useMemo(() => {

    return buildDocument(chapter.html).elements;
  }, [chapter]);


  const [index, setIndex] = useState(1);

  const nextParagraph = useCallback(() => {
    setIndex((prev) => prev + 1);
    console.log(index);
    return paragraphs[index + 1];
  }, [paragraphs]);

  return {
    paragraph: paragraphs[index],
    currentParagraphs: paragraphs.slice(0, Math.max(0,index)),
    paragraphs,
    nextParagraph,
  };
}
