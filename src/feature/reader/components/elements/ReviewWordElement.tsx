import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";


import { Button } from "#ui/button";
import { events } from "@/shared/commands/bindings";
import { ReviewWordElementType } from "../../lib/paragraph";
import { useReaderStore } from "../../store/ReaderStore";

export type ReviewWordElementProps = {
  element: ReviewWordElementType;
};

export const ReviewWordElement = ({
  element,
}: ReviewWordElementProps) => {
  const [selected, setSelected] = useState<string | null>(element.selectedAnswer ?? null);
  const startedAt = useRef(Date.now());
  const bookId = useReaderStore((state) => state.book?.id);
  const chapterId = useReaderStore((state) => state.chapterId);
  const elementId = useReaderStore((state) => state.elementId);

  useEffect(() => {
    if (element.selectedAnswer !== undefined) return;
    events.learningEvent.emit({
      id: crypto.randomUUID(), user_id: "0", timestamp: Date.now(), event_type: "ExerciseStarted",
      context: { book_id: bookId ?? null, chapter_id: chapterId || null, element_id: elementId || null, exercise_id: `${elementId}-translation`, question_id: null, skill_id: null, word_id: element.word },
      data: { type: "Empty" },
    });
  }, [element.selectedAnswer]);

  const answered = selected !== null;
  const correct = selected === element.answer;

  const handleSelect = (translation: string) => {
    if (answered) {
      return;
    }

    setSelected(translation);
    const correct = translation === element.answer;
    const responseTime = Date.now() - startedAt.current;
    const exerciseId = `${elementId}-translation`;
    events.learningEvent.emit({
      id: crypto.randomUUID(), user_id: "0", timestamp: Date.now(), event_type: "QuestionAnswered",
      context: { book_id: bookId ?? null, chapter_id: chapterId || null, element_id: elementId || null, exercise_id: exerciseId, question_id: element.word, skill_id: null, word_id: element.word },
      data: { type: "QuestionAnswered", correct, response_time_ms: responseTime, selected_answer: translation, correct_answer: element.answer, word_ids: [element.word], skill_ids: [] },
    });
    events.learningEvent.emit({
      id: crypto.randomUUID(), user_id: "0", timestamp: Date.now(), event_type: "ExerciseCompleted",
      context: { book_id: bookId ?? null, chapter_id: chapterId || null, element_id: elementId || null, exercise_id: exerciseId, question_id: null, skill_id: null, word_id: element.word },
      data: { type: "ExerciseCompleted", correct: Number(correct), total: 1, duration_ms: responseTime, skill_ids: [], word_ids: [element.word] },
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-xl border p-5">
      <div className="text-sm text-muted-foreground">
        Выберите перевод
      </div>

      <div className="text-center text-3xl font-semibold">
        {element.word}
      </div>

      <div className="grid gap-2">
        {element.translations.map((translation) => {
          const isSelected = selected === translation;
          const isCorrect = translation === element.answer;

          let className =
            "h-auto min-h-12 justify-start text-left";

          if (answered && isCorrect) {
            className += " border-green-500";
          }

          if (answered && isSelected && !isCorrect) {
            className += " border-red-500";
          }

          return (
            <Button
              key={translation}
              variant="outline"
              disabled={answered}
              className={className}
              onClick={() => handleSelect(translation)}
            >
              <span className="flex w-full items-center justify-between gap-3">
                <span>{translation}</span>

                {answered && isCorrect && (
                  <Check className="size-4" />
                )}

                {answered && isSelected && !isCorrect && (
                  <X className="size-4" />
                )}
              </span>
            </Button>
          );
        })}
      </div>

      {answered && (
        <div
          className={
            correct
              ? "text-sm text-green-600"
              : "text-sm text-red-600"
          }
        >
          {correct
            ? "Правильно"
            : `Неправильно. Правильный ответ: ${element.answer}`}
        </div>
      )}
    </div>
  );
};
