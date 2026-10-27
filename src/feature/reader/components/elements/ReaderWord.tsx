import { events } from "@/shared/commands/bindings";
import {
  ReaderWord as HtmlReaderWord,
} from "../../lib/html";

import { Popover } from "@base-ui/react";
import { memo } from "react";
import { getReaderWordId, useReaderSelection } from "../../hooks/useReaderSelection";
import type { ReaderElementPosition } from "../../hooks/useReaderSelection";
import { useReaderTranslation } from "../../hooks/useReaderTranslation";
import { useReaderStore } from "../../store/ReaderStore";
import { useReaderDisplayStore } from "../../store/ReaderDisplayStore";
import { useSettingsStore } from "@/shared/store/SettingsStore";
import { translationPopover } from "../reader/TranslationPopover";

type ReaderWordProps = {
  word: HtmlReaderWord;

  position: ReaderElementPosition;

  selection: ReturnType<
    typeof useReaderSelection
  >;
};

const lastTranslationEvent = new Map<string, number>();
const TRANSLATION_EVENT_COOLDOWN_MS = 30_000;

export const ReaderWord = memo(({
  word,
  position,
  selection,
}: ReaderWordProps) => {
  const { translate } =
    useReaderTranslation();

  const { chapterIndex, elementIndex } = position;



  const bookId = useReaderStore((state) => state.book?.id)
  const chapterId = useReaderStore((state) => state.chapterId )
  const readerMode = useReaderDisplayStore((state) => state.mode);
  const showWordTranslation = useSettingsStore((state) => state.config?.reader.show_word_translation ?? true);
  const showSentenceTranslation = useSettingsStore((state) => state.config?.reader.show_sentence_translation ?? true);

  const wordId =
    getReaderWordId({
      chapterIndex,
      elementIndex,
      wordIndex: word.index,
    });

  const isSelected = useReaderStore((state) => state.selectedIds.includes(wordId));

  const handleMouseDown = (
    event: React.MouseEvent<HTMLSpanElement>,
  ) => {
    event.preventDefault();

    selection.startSelection(
      chapterIndex,
      elementIndex,
      word.index,
    );
  };

  const handleMouseEnter = () => {
    if (
      selection.isSelectionStarted()
    ) {
      selection.updateSelection(
        chapterIndex,
        elementIndex,
        word.index,
      );
    }
  };

  // useEffect(() => {
  //   events.learningEvent.emit({
  //     "event_type": "WordSeen",
  //     id: crypto.randomUUID(),
  //     user_id: "0",
  //     timestamp: Date.now(),
  //     context: {
  //       book_id: bookId!,
  //       chapter_id: `${chapterId}`,
  //       element_id: `${elementIndex}`,
  //       exercise_id: null,
  //       question_id: null,
  //       skill_id: null,
  //       word_id: `${word.text}`
  //     },
  //     data: { type: "Empty" },
  //   })
  // }, [])

  const handleMouseUp = (
    event: React.MouseEvent<HTMLSpanElement>,
  ) => {
    event.preventDefault();

    const result =
      selection.finishSelection(
        chapterIndex,
        elementIndex,
        word.index,
      );

    if (!result) {
      return;
    }



    if (result.type === "selection") {
      if (!showSentenceTranslation) return;

      void translate({
        type: "selection",
        start: result.start,
        end: result.end,
        text: result.text,
      });

      requestAnimationFrame(() => {
        translationPopover.open(wordId);
      });

      return;
    }

    if (!showWordTranslation) return;

    const now = Date.now();
    const previousEventAt = lastTranslationEvent.get(wordId) ?? 0;
    if (readerMode === "learning" && now - previousEventAt >= TRANSLATION_EVENT_COOLDOWN_MS) {
      if (lastTranslationEvent.size > 3000) lastTranslationEvent.clear();
      lastTranslationEvent.set(wordId, now);
      events.learningEvent.emit({
      "event_type": "TranslationOpened",
      id: crypto.randomUUID(),
      user_id: "0",
      timestamp: now,
      context: {
        book_id: bookId!,
        chapter_id: `${chapterId}`,
        element_id: `${elementIndex}`,
        exercise_id: null,
        question_id: null,
        skill_id: null,
        word_id: `${word.text}`
      },
      data: {
        type: "Empty"
      },
      });
    }

    translationPopover.open(
      wordId,
    );

    void translate({
      type: "word",
      position: {
        chapterIndex,
        elementIndex,
        wordIndex: word.index,
      },
      text: word.text,
    });
  };


  return (
    <Popover.Trigger
      id={wordId}
      handle={translationPopover}
      nativeButton={false}
      render={
        <span
          data-reader-word-id={wordId}
          data-word-index={word.index}
          data-word={word.text}
          data-reader-word-chapter-index={
            chapterIndex
          }
          data-reader-word-element-index={
            elementIndex
          }
          data-reader-word-index={
            word.index
          }
          data-translation-word
          className={[
            "inline-block",
            "cursor-pointer",
            "border-b",
            "border-dashed",
            "border-foreground/50",
            "outline-none",
            "transition-all",
            "duration-100",
            "hover:bg-primary/20",
            "hover:rounded-sm",
            "hover:border-foreground/70",

            isSelected
              ? "bg-primary/25 border-primary/60 rounded-sm"
              : "",
          ].join(" ")}
          onMouseDown={
            handleMouseDown
          }
          onMouseEnter={
            handleMouseEnter
          }
          onMouseUp={
            handleMouseUp
          }
        >
          {word.text}
        </span>
      }
    />
  );
});
