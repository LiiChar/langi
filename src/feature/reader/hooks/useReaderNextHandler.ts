import { useCallback, useRef, useState } from "react";

import { commands } from "@/shared/commands/bindings";
import type { LearningEventData, LearningEventType } from "@/shared/commands/bindings";
import { extractWordsFromHtml } from "./useWordWrappedHtml";
import type { ReaderMode } from "../store/ReaderDisplayStore";
import { useReader } from "./useReader";

type ReaderState = ReturnType<typeof useReader>;

type ReaderNextHandlerOptions = Pick<
  ReaderState,
  | "next"
  | "advance"
  | "addActivity"
  | "currentElement"
  | "elements"
  | "getBaseElementIndex"
  | "getNewActivityIndex"
> & {
  currentChapter: NonNullable<ReaderState["currentChapter"]>;
  readerMode: ReaderMode;
  emitLearningEvent: (eventType: LearningEventType, payload: LearningEventData) => void;
};

export function useReaderNextHandler({
  currentChapter,
  readerMode,
  currentElement,
  elements,
  next,
  advance,
  addActivity,
  getBaseElementIndex,
  getNewActivityIndex,
  emitLearningEvent,
}: ReaderNextHandlerOptions) {
  const advancingRef = useRef(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  const onNextHandler = useCallback(async () => {
    if (readerMode !== "learning" || advancingRef.current) return;

    advancingRef.current = true;
    setIsAdvancing(true);
    setAdvanceError(null);

    let navigationResult: ReturnType<typeof next> | null = null;
    try {
      const result = next();
      navigationResult = result;

      switch (result.type) {
        case "element": {
          const isLearningExercise =
            currentElement?.type === "review-word" || currentElement?.type === "review-words";
          const nextVisibleElement = elements[result.elementIndex];
          const nextIsLearningExercise =
            nextVisibleElement?.type === "review-word" || nextVisibleElement?.type === "review-words";

          if (isLearningExercise || nextIsLearningExercise) return;

          const nextActivity = await commands.getNextActivity();
          if (nextActivity.status === "error") {
            navigationResult = null;
            setAdvanceError("Не удалось загрузить следующее упражнение");
            return;
          }

          const data = nextActivity.data;
          if ("WordReview" in data) {
            const words = data.WordReview.word_ids;
            if (words.length > 0) {
              const translated = await Promise.all(
                words.map(async (word) => {
                  const result = await commands.translate("", "", word);
                  return result.status === "ok" ? result.data : null;
                }),
              );

              if (translated.some((translation) => !translation)) {
                navigationResult = null;
                setAdvanceError("Не удалось перевести слово");
                return;
              }

              const anchorIndex = getBaseElementIndex(result.chapterIndex, result.elementIndex);
              if (anchorIndex === null) return;

              if (words.length === 1) {
                const word = words[0];
                const distractorWords = [...new Set(extractWordsFromHtml(currentChapter.html))]
                  .filter((candidate) => candidate.toLocaleLowerCase() !== word.toLocaleLowerCase())
                  .slice(0, 3);
                const distractors = await Promise.all(
                  distractorWords.map((candidate) => commands.translate("", "", candidate)),
                );
                const translations = [...new Set([
                  translated[0]!,
                  ...distractors.flatMap((item) => item.status === "ok" ? [item.data] : []),
                ])].slice(0, 4);

                addActivity(
                  { type: "review-word", word, answer: translated[0]!, translations },
                  anchorIndex,
                  result.chapterIndex,
                );
              } else {
                const translations = translated as string[];
                const pairs = Object.fromEntries(words.map((word, index) => [word, translations[index]]));

                addActivity(
                  { type: "review-words", words, translations, pairs },
                  anchorIndex,
                  result.chapterIndex,
                );
              }

              navigationResult = {
                ...result,
                elementIndex: getNewActivityIndex(result.chapterIndex, anchorIndex),
              };
            }
            return;
          }

          if ("SkillExercise" in data || "ComprehensionExercise" in data) {
            // Эти типы упражнений пока пропускаются.
            return;
          }

          if ("Translation" in data) {
            const word = data.Translation.word_id;
            const answerResult = await commands.translate("", "", word);
            if (answerResult.status === "error") {
              navigationResult = null;
              setAdvanceError("Не удалось перевести слово");
              return;
            }

            const distractorWords = [...new Set(
              extractWordsFromHtml(currentChapter.html)
                .filter((candidate) => candidate.toLocaleLowerCase() !== word.toLocaleLowerCase()),
            )].slice(0, 3);
            const distractorResults = await Promise.all(
              distractorWords.map((candidate) => commands.translate("", "", candidate)),
            );
            const translations = [...new Set([
              answerResult.data,
              ...distractorResults.flatMap((item) => item.status === "ok" ? [item.data] : []),
            ])].slice(0, 4);

            const anchorIndex = getBaseElementIndex(result.chapterIndex, result.elementIndex);
            if (anchorIndex === null) return;

            addActivity(
              { type: "review-word", word, answer: answerResult.data, translations },
              anchorIndex,
              result.chapterIndex,
            );
            navigationResult = {
              ...result,
              elementIndex: getNewActivityIndex(result.chapterIndex, anchorIndex),
            };
          }

          return;
        }

        case "chapter_completed":
          if (readerMode === "learning") {
            emitLearningEvent("ChapterCompleted", { type: "Empty" });
          }
          return;

        case "book_completed":
          return;
      }
    } catch (error) {
      navigationResult = null;
      setAdvanceError(error instanceof Error ? error.message : "Не удалось загрузить следующее задание");
    } finally {
      if (navigationResult) advance(navigationResult);
      advancingRef.current = false;
      setIsAdvancing(false);
    }
  }, [
    addActivity,
    advance,
    currentChapter.html,
    currentElement,
    elements,
    emitLearningEvent,
    getBaseElementIndex,
    getNewActivityIndex,
    next,
    readerMode,
  ]);

  return { onNextHandler, isAdvancing, advanceError };
}
