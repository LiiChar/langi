import { useCallback, useState } from "react";
import { useReaderSelection } from "../hooks/useReaderSelection";
import { ParagraphElementType } from "../lib/paragraph";
import { commands } from "@/shared/commands/bindings";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "#ui/popover";

type ParagraphElementProps = {
  element: ParagraphElementType;
  selection: ReturnType<typeof useReaderSelection>;
};

type TranslationState = {
  status: "idle" | "loading" | "success" | "error";
  value?: string;
};

const normalizeWord = (word: string): string => {
  return word
    .trim()
    .replace(
      /^[.,!?;:()[\]{}"'«»„“”‘’]+|[.,!?;:()[\]{}"'«»„“”‘’]+$/g,
      "",
    );
};

export const ParagraphElement = ({
  element,
  selection,
}: ParagraphElementProps) => {
  const words = element.text.split(/\s+/);

  const [translations, setTranslations] = useState<
    Record<string, TranslationState>
  >({});

  const translateWord = useCallback(
    async (word: string) => {
      const normalized = normalizeWord(word);

      if (!normalized) {
        return;
      }

      const current = translations[normalized];

      if (
        current?.status === "loading" ||
        current?.status === "success"
      ) {
        return;
      }

      setTranslations((prev) => ({
        ...prev,
        [normalized]: {
          status: "loading",
        },
      }));

      try {
        const result = await commands.translate(
          "en",
          "ru",
          normalized,
        );

        if (result.status === "ok") {
          setTranslations((prev) => ({
            ...prev,
            [normalized]: {
              status: "success",
              value: result.data,
            },
          }));

          return;
        }

        setTranslations((prev) => ({
          ...prev,
          [normalized]: {
            status: "error",
          },
        }));
      } catch {
        setTranslations((prev) => ({
          ...prev,
          [normalized]: {
            status: "error",
          },
        }));
      }
    },
    [translations],
  );

  return (
    <div
      className="
        flex
        flex-wrap
        gap-x-1
        w-full
        rounded-md
        transition-colors
        duration-200

        hover:bg-primary/10
        has-[span:hover]:bg-transparent
      "
    >
      {words.map((word, index) => {
        const normalized = normalizeWord(word);

        if (!normalized) {
          return (
            <span key={`${word}-${index}`}>
              {word}
            </span>
          );
        }

        const translation =
          translations[normalized];

        const selected =
          selection.isSelected(
            element.index,
            index,
          );

        return (
          <Popover
            key={`${normalized}-${index}-${element.index}`}
          >
            <PopoverTrigger
              render={
                <span
                  className={`
                    transition-all select-none cursor-pointer border-b border-dashed outline-primary/0 border-foreground/50 hover:bg-primary/40 hover:outline-primary/40 hover:outline-1 hover:rounded-md

                    ${
                      selected
                        ? "bg-primary/40 outline-primary/40 outline-1 rounded-md"
                        : ""
                    }
                  `}
                  onMouseDown={(event) => {
                    if (event.button !== 0) {
                      return;
                    }

                    event.preventDefault();

                    selection.startSelection(
                      element.index,
                      index,
                    );
                  }}
                  onMouseEnter={() => {
                    selection.updateSelection(
                      element.index,
                      index,
                    );
                  }}
                  onMouseUp={(event) => {
                    if (event.button !== 0) {
                      return;
                    }

                    const wasSelecting =
                      selection.finishSelection(
                        element.index,
                        index,
                      );

                    if (!wasSelecting) {
                      translateWord(word);
                    }
                  }}
                >
                  {word}
                </span>
              }
            />

            <PopoverContent>
              <PopoverHeader>
                <PopoverTitle>
                  {translation?.status === "loading" &&
                    "Перевод..."}

                  {translation?.status === "success" &&
                    translation.value}

                  {translation?.status === "error" &&
                    "Не удалось перевести"}

                  {!translation &&
                    "Загрузка..."}
                </PopoverTitle>
              </PopoverHeader>
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
};
