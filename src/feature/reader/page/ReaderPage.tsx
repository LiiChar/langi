import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useReader } from "../hooks/useReader";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { commands, events, LearningEventData, LearningEventType } from "@/shared/commands/bindings";
import { useAutoScroll } from "#hooks/index";
import { useReaderStore } from "../store/ReaderStore";
import { useReaderSelection } from "../hooks/useReaderSelection";
import { convertBook } from "@/shared/commands/import";
import { TranslationPopover } from "../components/reader/TranslationPopover";
import { useSettingsStore } from "@/shared/store/SettingsStore";
import { extractWordsFromHtml } from "../hooks/useWordWrappedHtml";
import { useReaderDisplayStore } from "../store/ReaderDisplayStore";
import { FreeReadingView, type FreeReadingNavigation } from "../components/reader/FreeReadingView";
import { restoreCompletedExercises } from "../lib/restoreActivities";
import { ReaderSidebar } from "../components/layout/ReaderSidebar";
import { ContentRenderer } from "../components/elements/ContentRenderer";
import { ReaderFocusControls } from "../components/layout/ReaderFocusControls";
import { ReaderActions } from "../components/reader/ReaderActions";
import { useControlsFocus } from "../hooks/useControlFocus";
import { ReaderIframe } from "../components/reader/ReaderIframe";
import { useI18n } from "@/shared/i18n";
import { useLayoutStore } from "@/feature/layout/store/LayoutStore";

type ReaderLayoutSnapshot = Pick<
  ReturnType<typeof useLayoutStore.getState>,
  | "sidebarMode"
  | "header"
  | "prevHeader"
  | "headerVisible"
  | "rightSidebar"
  | "rightSidebarVisible"
>;

export const ReaderPage = () => {
  const routeApi = getRouteApi("/book/$bookId/read/");
  const navigate = useNavigate();

  const data = routeApi.useLoaderData();
  const book = useMemo(
    () => data.status === "ok" ? convertBook(data.data) : null,
    [data],
  );
  const closeReaderSidebar = useReaderDisplayStore((state) => state.closeSidebar);

  useLayoutEffect(() => {
    closeReaderSidebar();
  }, [book?.id, closeReaderSidebar]);

  const sessionStartedAt = useRef(Date.now());
  const previousChapterId = useRef<string | null>(null);
  const seenParagraphs = useRef<Set<string>>(new Set());

  const setStoreBook = useReaderStore((state) => state.setBook);
  const setElements = useReaderStore((state) => state.setElements);
  const setChapterId = useReaderStore((state) => state.setChapterId);
  const setElementId = useReaderStore((state) => state.setElementId);
  const readerConfig = useSettingsStore((state) => state.config?.reader);
  const loadSettings = useSettingsStore((state) => state.load);


  useEffect(() => { if (!readerConfig) void loadSettings(); }, [readerConfig, loadSettings]);

  if (!book) {
    navigate({ to: "/" });
    return null;
  }

  if (book.chapters == null) {
    navigate({ to: "/" });
    return null;
  }

  const {
    currentChapter,
    currentChapterIndex,
    currentElement,
    currentElementIndex,
    elements,
    allChapterElements,
    completedElements,
    next,
    advance,
    restorePosition,
    addActivity,
    restoreActivities,
    getBaseElementIndex,
    getElementKey,
    getNewActivityIndex,
  } = useReader(book.chapters);
  const readerMode = useReaderDisplayStore((state) => state.mode);
  const readerSidebarOpen = useReaderDisplayStore((state) => state.sidebarOpen);
  const openReaderSidebar = useReaderDisplayStore((state) => state.openSidebar);
  const textAlign = useReaderDisplayStore((state) => state.textAlign);
  const paragraphSpacing = useReaderDisplayStore((state) => state.paragraphSpacing);
  const saveFreePosition = useReaderDisplayStore((state) => state.saveFreePosition);

  const [positionReady, setPositionReady] = useState(false);
  const [freeReadingNavigation, setFreeReadingNavigation] = useState<FreeReadingNavigation | null>(null);
  const registerFreeReadingNavigation = useCallback((navigation: FreeReadingNavigation | null) => {
    setFreeReadingNavigation(navigation);
  }, []);
  const restorePositionRef = useRef(restorePosition);
  restorePositionRef.current = restorePosition;

  useEffect(() => {
    let active = true;
    setPositionReady(false);
    void Promise.all([
      commands.getBookReadingPosition(book.id).catch(() => null),
      commands.getBookExerciseEvents(book.id).catch(() => null),
    ]).then(([positionResult, eventResult]) => {
      if (!active) return;
      if (eventResult?.status === "ok") {
        restoreActivities(restoreCompletedExercises(book.chapters, eventResult.data));
      }
      if (positionResult?.status === "ok" && positionResult.data) {
        const { chapter_id: chapterId, element_id: elementId } = positionResult.data;
        const chapterByElement = book.chapters.findIndex((chapter) => elementId.startsWith(`${chapter.id}-`));
        const chapterIndex = chapterByElement >= 0 ? chapterByElement : book.chapters.findIndex((chapter) => chapter.id === chapterId);
        const separator = elementId.lastIndexOf("-");
        const elementIndex = Number(elementId.slice(separator + 1));
        if (chapterIndex >= 0 && separator >= 0 && Number.isInteger(elementIndex) && elementIndex >= 0) {
          restorePositionRef.current(chapterIndex, elementIndex);
        }
      }
      setPositionReady(true);
    });
    return () => { active = false; };
  }, [book.id, book.chapters, restoreActivities]);

  useEffect(() => {
    const hasCyrillic = book.chapters.some((chapter) => /[а-яё]/i.test(chapter.html));
    const language = hasCyrillic ? "ru" : (book.meta.language || "en");
    void commands.prepareSpeechForLanguage(language);
  }, [book.id, book.meta.language]);

  const freeReadingElements = useMemo(() => allChapterElements.flatMap((chapterElements, chapterIndex) => chapterElements.map((element, elementIndex) => ({ element, chapterIndex, elementIndex }))), [allChapterElements]);
  const completedByChapter = useMemo(() => {
    const groups = new Map<number, typeof completedElements>();
    for (const element of completedElements) {
      const group = groups.get(element.chapterIndex) ?? [];
      group.push(element);
      groups.set(element.chapterIndex, group);
    }
    return [...groups.entries()];
  }, [completedElements]);
  const selection = useReaderSelection(readerMode === "free" ? freeReadingElements : completedElements);


  const readerBoundaryRef = useRef<HTMLDivElement | null>(null);

  const [readerBoundary, setReaderBoundary] =
    useState<HTMLDivElement | null>(null);

  useAutoScroll(readerBoundaryRef, { enabled: readerMode === "learning" });

  const setReaderBoundaryRef = useCallback(
    (element: HTMLDivElement | null) => {
      readerBoundaryRef.current = element;
      setReaderBoundary(element);
    },
    [],
  );

  const getVisibleFreePosition = useCallback(() => {
    const container = readerBoundaryRef.current;
    if (!container) return null;
    const containerTop = container.getBoundingClientRect().top;
    const contentElements = Array.from(container.querySelectorAll<HTMLElement>("[data-reader-content]"));
    const element = contentElements.find((item) => item.getBoundingClientRect().bottom > containerTop + 8) ?? contentElements[contentElements.length - 1];
    const identity = element?.dataset.readerContent;
    if (!element || !identity) return null;
    const separator = identity.lastIndexOf("-");
    const chapterIndex = Number(identity.slice(0, separator));
    const elementIndex = Number(identity.slice(separator + 1));
    if (separator < 0 || !Number.isInteger(chapterIndex) || !Number.isInteger(elementIndex)) return null;
    return {
      chapterIndex,
      elementIndex,
      offset: element.getBoundingClientRect().top - containerTop,
    };
  }, []);

  const saveCurrentFreePosition = useCallback(() => {
    if (readerMode !== "free") return;
    const position = getVisibleFreePosition();
    if (position) saveFreePosition(book.id, position);
  }, [book.id, getVisibleFreePosition, readerMode, saveFreePosition]);

  const freePositionSaveTimer = useRef<number | null>(null);
  const scheduleFreePositionSave = useCallback(() => {
    if (readerMode !== "free") return;
    if (freePositionSaveTimer.current !== null) window.clearTimeout(freePositionSaveTimer.current);
    freePositionSaveTimer.current = window.setTimeout(() => {
      freePositionSaveTimer.current = null;
      saveCurrentFreePosition();
    }, 120);
  }, [readerMode, saveCurrentFreePosition]);

  useEffect(() => {
    if (readerMode !== "free") return;
    return () => {
      if (freePositionSaveTimer.current !== null) {
        window.clearTimeout(freePositionSaveTimer.current);
        freePositionSaveTimer.current = null;
      }
      saveCurrentFreePosition();
    };
  }, [readerMode, saveCurrentFreePosition]);

  useEffect(() => {
    if (readerMode !== "free" || !positionReady || !readerBoundary || !freeReadingNavigation) return;
    const position = useReaderDisplayStore.getState().freePositions[book.id];
    if (!position) {
      readerBoundary.scrollTop = 0;
      return;
    }
    freeReadingNavigation.scrollToPosition(position);
  }, [book.id, freeReadingNavigation, positionReady, readerBoundary, readerMode]);

  useEffect(() => {
    if (readerMode !== "learning" || !positionReady || !readerBoundary) return;
    const frame = window.requestAnimationFrame(() => {
      const target = readerBoundary.querySelector<HTMLElement>(`[data-reader-content="${currentChapterIndex}-${currentElementIndex}"]`);
      if (!target) return;
      const targetRect = target.getBoundingClientRect();
      const containerRect = readerBoundary.getBoundingClientRect();
      if (targetRect.bottom > containerRect.bottom) readerBoundary.scrollTop += targetRect.bottom - containerRect.bottom;
      else if (targetRect.top < containerRect.top) readerBoundary.scrollTop -= containerRect.top - targetRect.top;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentChapterIndex, currentElementIndex, positionReady, readerBoundary, readerMode]);

  const emitLearningEvent = (
    eventType: LearningEventType,
    payload: LearningEventData,
  ) => {
    if (readerMode !== "learning") return;

    events.learningEvent.emit({
      id: crypto.randomUUID(),
      user_id: "0",
      event_type: eventType,
      timestamp: Date.now(),
      context: {
        book_id: book.id,
        chapter_id: currentChapter.id,
        element_id: currentChapter.id + "-" + currentElementIndex,
        exercise_id: null,
        question_id: null,
        skill_id: null,
        word_id: null
      },
      data: payload,
    });

  };

  useEffect(() => {
    setStoreBook(book);
  }, [book, setStoreBook]);

  useEffect(() => {
    if (readerMode !== "learning") return;
    sessionStartedAt.current = Date.now();
    seenParagraphs.current = new Set();

    emitLearningEvent("ReadingSessionStarted", { type: "Empty" });

    return () => {
      const durationSeconds = Math.floor(
        (Date.now() - sessionStartedAt.current) / 1000,
      );

      emitLearningEvent("ReadingSessionFinished", {
        type: "ReadingSession",
        seconds: durationSeconds,
        paragraphs_seen: seenParagraphs.current.size,
      });
    };
  }, [book.id, readerMode]);

  useEffect(() => {
    setElements(completedElements);
  }, [completedElements, setElements]);

  useEffect(() => {
    if (readerMode !== "learning") return;
    if (!positionReady) return;
    if (!currentChapter) {
      return;
    }

    if (previousChapterId.current === currentChapter.id) {
      return;
    }

    previousChapterId.current = currentChapter.id;


    setElementId(`${currentChapter.id}-${currentElementIndex}`);
    emitLearningEvent("ChapterOpened", { type: "Empty" });
    setChapterId(currentChapter.id);
  }, [currentChapter, currentChapterIndex, currentElementIndex, positionReady, readerMode]);

  useEffect(() => {
    if (readerMode !== "learning" || !positionReady || !currentChapter) return;
    setElementId(`${currentChapter.id}-${currentElementIndex}`);
    void commands.saveBookReadingPosition(book.id, currentChapter.id, `${currentChapter.id}-${currentElementIndex}`);
  }, [book.id, currentChapter, currentElementIndex, positionReady, readerMode, setElementId]);

  /**
   * Paragraph seen.
   */
  useEffect(() => {
    if (readerMode !== "learning") return;
    if (!positionReady) return;
    if (!currentElement) {
      return;
    }

    if (currentElement.type !== "paragraph") {
      return;
    }

    const elementId =
      `${currentChapter.id}-${currentElementIndex}`;

    if (seenParagraphs.current.has(elementId)) {
      return;
    }

    seenParagraphs.current.add(elementId);

    emitLearningEvent("ParagraphSeen", {
      type: "Empty",
    });
  }, [
    positionReady,
    currentElement,
    currentChapter.id,
    currentElementIndex,
    readerMode,
  ]);

  const advancingRef = useRef(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  const onNextHandler = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setIsAdvancing(true);
    setAdvanceError(null);
    let navigationResult: ReturnType<typeof next> | null = null;
    try {
    const result = next();
    navigationResult = result;

    switch (result.type) {
      case "element": {
        const isLearningExercise = currentElement?.type === "review-word" || currentElement?.type === "review-words";
        const nextVisibleElement = elements[result.elementIndex];
        const nextIsLearningExercise = nextVisibleElement?.type === "review-word" || nextVisibleElement?.type === "review-words";
        if (isLearningExercise || nextIsLearningExercise) return;

        const nextActivity = await commands.getNextActivity();

        if (nextActivity.status === "error") {
          return;
        }

        const data = nextActivity.data;

        if ("WordReview" in data) {
          const review = data.WordReview;

          if (review.word_ids.length > 0) {
            const words = review.word_ids;
            const translated = await Promise.all(words.map(async (word) => {
              const result = await commands.translate("", "", word);
              return result.status === "ok" ? result.data : null;
            }));
            if (translated.some((translation) => !translation)) return;
            if (words.length === 1) {
              const distractorWords = [...new Set(extractWordsFromHtml(currentChapter.html))]
                .filter((candidate) => candidate.toLocaleLowerCase() !== words[0].toLocaleLowerCase())
                .slice(0, 3);
              const distractors = await Promise.all(distractorWords.map((candidate) => commands.translate("", "", candidate)));
              const choices = [...new Set([translated[0]!, ...distractors.flatMap((result) => result.status === "ok" ? [result.data] : [])])].slice(0, 4);
              const anchorIndex = getBaseElementIndex(result.chapterIndex, result.elementIndex);
              if (anchorIndex !== null) {
                addActivity({ type: "review-word", word: words[0], answer: translated[0]!, translations: choices }, anchorIndex, result.chapterIndex);
                navigationResult = { ...result, elementIndex: getNewActivityIndex(result.chapterIndex, anchorIndex) };
              }
              return;
            }
            const pairs = Object.fromEntries(words.map((word, index) => [word, translated[index]!]));

            const anchorIndex = getBaseElementIndex(result.chapterIndex, result.elementIndex);
            if (anchorIndex === null) return;
            addActivity(
              {
                type: "review-words",
                words,
                translations: translated as string[],
                pairs,
              },
              anchorIndex,
              result.chapterIndex,
            );
            navigationResult = { ...result, elementIndex: getNewActivityIndex(result.chapterIndex, anchorIndex) };
          }

          return;
        }

        if ("SkillExercise" in data) {
          // Создание упражнения на основе SkillExercise.
          return;
        }

        if ("Translation" in data) {
          const word = data.Translation.word_id;
          const answerResult = await commands.translate("", "", word);
          if (answerResult.status === "error") return;

          const distractorWords = [...new Set(
            extractWordsFromHtml(currentChapter.html)
              .filter((candidate) => candidate.toLocaleLowerCase() !== word.toLocaleLowerCase()),
          )].slice(0, 3);
          const distractorResults = await Promise.all(
            distractorWords.map((candidate) => commands.translate("", "", candidate)),
          );
          const translations = [...new Set([
            answerResult.data,
            ...distractorResults.flatMap((result) => result.status === "ok" ? [result.data] : []),
          ])].slice(0, 4);
          const anchorIndex = getBaseElementIndex(result.chapterIndex, result.elementIndex);
          if (anchorIndex === null) return;
          addActivity({
            type: "review-word",
            word,
            answer: answerResult.data,
            translations,
          }, anchorIndex, result.chapterIndex);
          navigationResult = { ...result, elementIndex: getNewActivityIndex(result.chapterIndex, anchorIndex) };
          return;
        }

        if ("ComprehensionExercise" in data) {
          // Создание упражнения на основе ComprehensionExercise.
          return;
        }

        return;
      }

      case "chapter_completed": {
        emitLearningEvent("ChapterCompleted", {
          type: "Empty",
        });

        return;
      }

      case "book_completed": {
        // Завершение книги.
        return;
      }
    }
    } catch (error) {
      setAdvanceError(error instanceof Error ? error.message : "Не удалось загрузить следующее задание");
    } finally {
      if (navigationResult) advance(navigationResult);
      advancingRef.current = false;
      setIsAdvancing(false);
    }
  }, [next, advance, addActivity, emitLearningEvent, currentElement, elements, getBaseElementIndex, getNewActivityIndex]);

  const { controlRef, visible} = useControlsFocus(".reader")
  const { t } = useI18n();

  const setSidebarMode = useLayoutStore((state) => state.setSidebarMode);
  const setHeaderVisible = useLayoutStore((state) => state.setHeaderVisible);
  const setRightSidebar = useLayoutStore((state) => state.setRightSidebar);
  const setHeader = useLayoutStore((state) => state.setHeader);
  const layoutSnapshotRef = useRef<ReaderLayoutSnapshot | null>(null);

  useLayoutEffect(() => {
    const {
      sidebarMode,
      header,
      prevHeader,
      headerVisible,
      rightSidebar,
      rightSidebarVisible,
    } = useLayoutStore.getState();
    layoutSnapshotRef.current = {
      sidebarMode,
      header,
      prevHeader,
      headerVisible,
      rightSidebar,
      rightSidebarVisible,
    };

    setSidebarMode('hide');
    setHeaderVisible(true);

    return () => {
      const snapshot = layoutSnapshotRef.current;
      if (snapshot) useLayoutStore.setState(snapshot);
      layoutSnapshotRef.current = null;
    };
  }, [setHeaderVisible, setSidebarMode]);

  useLayoutEffect(() => {
    setHeader(
      <div className="h-1 w-full">
        <ReaderFocusControls
          visible={visible}
          ref={controlRef}
        />
      </div>
    );
  }, [controlRef, setHeader, visible]);

  useLayoutEffect(() => {
    setRightSidebar(
      <ReaderSidebar
      chapters={book.chapters}
      mode={readerMode}
      activeChapterIndex={currentChapterIndex}
      onNavigateToChapter={(chapterIndex) => {
        if (readerMode === "free") freeReadingNavigation?.scrollToChapter(chapterIndex);
        else document.getElementById(`reader-chapter-${chapterIndex}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    />);
  }, [book.chapters, currentChapterIndex, freeReadingNavigation, readerMode, setRightSidebar]);

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <ReaderIframe contentSelector=".reader"/>
      <div className="flex min-h-0 flex-1 gap-1">
        <div className="window min-w-0 flex-1 gap-3 overflow-hidden relative">
          <div ref={setReaderBoundaryRef} onScroll={scheduleFreePositionSave} className=" h-full min-w-0 flex-1 overflow-y-auto p-6 pb-8 reader">
            <div
              className="flex flex-col mx-auto"
              style={{
                gap: `${paragraphSpacing}rem`,
                maxWidth: readerConfig?.content_width,
                fontSize: readerConfig?.font_size,
                lineHeight: readerConfig?.line_height,
                fontFamily: readerConfig?.font_family,
                textAlign,
                padding:readerConfig?.content_width ? undefined : 16,
              }}
            >
              {readerMode === "learning" ?
                <>
                  {completedByChapter.map(([chapterIndex, chapterElements]) =>
                    (<section key={chapterIndex} id={`reader-chapter-${chapterIndex}`} className="scroll-mt-4 space-y-4">
                      {chapterElements.map((element) => (
                        <ContentRenderer
                          element={element.element}
                          key={getElementKey(element.chapterIndex, element.elementIndex)}
                          selection={selection}
                          chapterIndex={element.chapterIndex}
                          elementIndex={element.elementIndex}
                        />
                      ))}
                    </section>)
                  )}
                </>
              :
              <FreeReadingView
                chapters={book.chapters}
                chapterElements={allChapterElements}
                scrollElement={readerBoundary}
                paragraphSpacing={paragraphSpacing}
                selection={selection}
                onNavigationReady={registerFreeReadingNavigation}
              />
            }
          </div>
          <TranslationPopover collisionBoundary={readerBoundary} />
          </div>
          <ReaderActions element={currentElement} isAdvancing={isAdvancing} onNext={onNextHandler} progress={(currentElementIndex / elements.length) * 100} />
        </div>


      </div>

      {!readerSidebarOpen && (
        <button
          type="button"
          aria-label={t("reader.settings")}
          title={t("reader.settings")}
          data-reader-sidebar-trigger="true"
          onClick={() => openReaderSidebar("settings")}
          className="absolute inset-y-0 right-0 z-20 w-[3px] cursor-pointer border-0 bg-transparent p-0 outline-none focus-visible:bg-primary/30"
        />
      )}

      {advanceError &&
        <p role="alert" className="absolute bottom-14 right-3 z-10 max-w-sm rounded-md bg-background px-3 py-2 text-sm text-destructive shadow">
          {advanceError}
        </p>
      }


    </div>
  );
};
