import { Chapter } from "@/entities/book/book.type";
import { useState } from "react";

export const useReader = (chapters: Chapter[]) => {
  const [currentChapter, setCurrentChapter] = useState<Chapter>(() => chapters[0]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleNextChapter = () => {
    const nextIndex = (currentChapterIndex + 1) % chapters.length;
    setCurrentChapterIndex(nextIndex);
    setCurrentChapter(chapters[nextIndex]);
  };

  return {
    currentChapter,
    currentChapterIndex,
    isLoading,
    error,
    handleNextChapter,
  };
}
