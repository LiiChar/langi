import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";


import { Button } from "#ui/button";
import { events } from "@/shared/commands/bindings";
import { ReviewWordsElementType } from "../../lib/paragraph";
import { useReaderStore } from "../../store/ReaderStore";

export type ReviewWordsElementProps = {
  element: ReviewWordsElementType;
};

export const ReviewWordsElement = ({
  element,
}: ReviewWordsElementProps) => {
  const [selectedWord, setSelectedWord] =
    useState<string | null>(null);

  const [selectedTranslation, setSelectedTranslation] =
    useState<string | null>(null);

  const [matched, setMatched] = useState<
    Record<string, string>
  >(element.initialMatched ?? {});
  const startedAt = useRef(Date.now());
  const questionStartedAt = useRef(Date.now());
  const correctCount = useRef(0);
  const attemptCount = useRef(0);

  const bookId = useReaderStore((state) => state.book?.id);
  const chapterId = useReaderStore((state) => state.chapterId);
  const elementId = useReaderStore((state) => state.elementId);

  const translations = useMemo(
    () => [...element.translations],
    [element.translations],
  );

  const isCompleted =
    Object.keys(matched).length === element.words.length;

  useEffect(() => {
    if (element.initialMatched && Object.keys(element.initialMatched).length === element.words.length) return;
    events.learningEvent.emit({
      id: crypto.randomUUID(),
      user_id: "0",
      event_type: "ExerciseStarted",
      timestamp: Date.now(),

      context: {
        book_id: bookId!,
        chapter_id: chapterId!,
        element_id: elementId!,
        exercise_id: `${elementId}-review-words`,
        question_id: null,
        skill_id: null,
        word_id: null,
      },

      data: {
        type: "Empty",
      },
    });
  }, [element.initialMatched, element.words.length]);

  const handleWordClick = (word: string) => {
    if (matched[word]) {
      return;
    }

    setSelectedWord(
      selectedWord === word ? null : word,
    );
    questionStartedAt.current = Date.now();
  };

  const handleTranslationClick = (
    translation: string,
  ) => {
    if (!selectedWord) {
      setSelectedTranslation(
        selectedTranslation === translation
          ? null
          : translation,
      );

      return;
    }

    const correct =
      element.pairs[selectedWord] === translation;
    attemptCount.current += 1;
    const responseTime = Date.now() - questionStartedAt.current;

    if (correct) {
      setMatched((current) => ({
        ...current,
        [selectedWord]: translation,
      }));
      correctCount.current += 1;

      setSelectedWord(null);
      setSelectedTranslation(null);

      events.learningEvent.emit({
        id: crypto.randomUUID(),
        user_id: "0",
        timestamp: Date.now(),
        event_type: "QuestionAnswered",
        context: {
          exercise_id: `${elementId}-review-words`,
          question_id: selectedWord,
          word_id: selectedWord,
          book_id: bookId!,
          chapter_id: chapterId!,
          element_id: elementId!,
          skill_id: null,
        },
        data: {
          type: "QuestionAnswered",
          correct: true,
          response_time_ms: responseTime,
          selected_answer: translation,
          correct_answer: element.pairs[selectedWord],
          word_ids: [selectedWord],
          skill_ids: [],
        }
      });
      if (Object.keys(matched).length + 1 === element.words.length) {
        events.learningEvent.emit({
          id: crypto.randomUUID(), user_id: "0", timestamp: Date.now(), event_type: "ExerciseCompleted",
          context: { exercise_id: `${elementId}-review-words`, question_id: null, word_id: null, book_id: bookId!, chapter_id: chapterId!, element_id: elementId!, skill_id: null },
          data: { type: "ExerciseCompleted", correct: correctCount.current, total: element.words.length, duration_ms: Date.now() - startedAt.current, skill_ids: [], word_ids: element.words },
        });
      }
    } else {

      events.learningEvent.emit({
        event_type: "QuestionAnswered",
        id: crypto.randomUUID(),
        user_id: "0",
        timestamp: Date.now(),
        context: {
          exercise_id: `${elementId}-review-words`,
          question_id: selectedWord,
          word_id: selectedWord,
          book_id: bookId!,
          chapter_id: chapterId!,
          element_id: elementId!,
          skill_id: null,
        },
        data: {
          type: "QuestionAnswered",
          correct: false,
          response_time_ms: responseTime,
          selected_answer: translation,
          correct_answer: element.pairs[selectedWord],
          word_ids: [selectedWord],
          skill_ids: [],
        },

      });

      setSelectedTranslation(translation);

      window.setTimeout(() => {
        setSelectedTranslation(null);
      }, 500);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-xl py-5">
      <div className="text-sm text-muted-foreground">
        Соедините слова с переводами
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          {element.words.map((word) => {
            const matchedTranslation = matched[word];

            const selected =
              selectedWord === word;

            return (
              <Button
                key={word}
                variant={
                  matchedTranslation
                    ? "secondary"
                    : "outline"
                }
                disabled={Boolean(matchedTranslation)}
                className={[
                  "min-h-11 justify-between",
                  selected && "ring-2",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() =>
                  handleWordClick(word)
                }
              >
                <span>{word}</span>

                {matchedTranslation && (
                  <Check className="size-4" />
                )}
              </Button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          {translations.map((translation) => {
            const matchedWord = Object.entries(
              matched,
            ).find(
              ([, value]) =>
                value === translation,
            )?.[0];

            const selected =
              selectedTranslation === translation;

            const isWrong =
              selected &&
              selectedWord !== null &&
              element.pairs[selectedWord] !==
                translation;

            return (
              <Button
                key={translation}
                variant={
                  matchedWord
                    ? "secondary"
                    : "outline"
                }
                disabled={Boolean(matchedWord)}
                className={[
                  "min-h-11 justify-between",
                  selected && "ring-2",
                  isWrong && "border-red-500",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() =>
                  handleTranslationClick(
                    translation,
                  )
                }
              >
                <span>{translation}</span>

                {matchedWord && (
                  <Check className="size-4" />
                )}

                {isWrong && (
                  <X className="size-4" />
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {isCompleted && (
        <div className="text-center text-sm text-green-600">
          Все пары сопоставлены
        </div>
      )}
    </div>
  );
};
