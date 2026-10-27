import { useState } from "react";
import { Check, X } from "lucide-react";

import {
  SentenceElementType,
} from "../../lib/paragraph";

import { Button } from "#ui/button";

export type SentenceElementProps = {
  element: SentenceElementType;
};

export const SentenceElement = ({
  element,
}: SentenceElementProps) => {
  const [selected, setSelected] =
    useState<string | null>(null);

  const answered = selected !== null;
  const correct = selected === element.answer;

  const handleSelect = (choice: string) => {
    if (answered) {
      return;
    }

    setSelected(choice);
  };

  const sentenceParts = element.sentence.split("___");

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 rounded-xl border p-5">
      <div className="text-sm text-muted-foreground">
        Выберите пропущенное слово
      </div>

      <div className="text-center text-xl leading-relaxed">
        {sentenceParts.map((part, index) => (
          <span key={index}>
            {part}

            {index < sentenceParts.length - 1 && (
              <span className="mx-1 inline-block min-w-20 border-b-2 text-primary">
                {selected ?? "_____"}
              </span>
            )}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {element.choices.map((choice) => {
          const isSelected = selected === choice;
          const isCorrect = choice === element.answer;

          return (
            <Button
              key={choice}
              variant="outline"
              disabled={answered}
              className={[
                "min-h-11 justify-between",
                answered &&
                  isCorrect &&
                  "border-green-500",
                answered &&
                  isSelected &&
                  !isCorrect &&
                  "border-red-500",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() =>
                handleSelect(choice)
              }
            >
              <span>{choice}</span>

              {answered && isCorrect && (
                <Check className="size-4" />
              )}

              {answered &&
                isSelected &&
                !isCorrect && (
                  <X className="size-4" />
                )}
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
            : `Правильный ответ: ${element.answer}`}
        </div>
      )}
    </div>
  );
};
