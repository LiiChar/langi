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
import { useReaderLayout } from "../hooks/useReaderLayout";
import { useReaderNextHandler } from "../hooks/useReaderNextHandler";
import type { Book } from "@/entities/book/book.type";
import { useLayoutStore } from "@/feature/layout/store/LayoutStore";

export const ReaderPage = () => {
  const routeApi = getRouteApi("/book/$bookId/read/");
  const navigate = useNavigate();

  const data = routeApi.useLoaderData();
  const book = useMemo(
    () => data.status === "ok" ? convertBook(data.data) : null,
    [data],
  );

  useEffect(() => {
    if (!book || book.chapters.length === 0) {
      void navigate({ to: "/" });
    }
  }, [book, navigate]);

  if (!book || book.chapters.length === 0) return null;

  return <ReaderSessionPage key={book.id} book={book} />;
};

function ReaderSessionPage({ book }: { book: Book }) {
  const hideRightSidebar = useLayoutStore((state) => state.hideRightSidebar);

  useLayoutEffect(() => {
    hideRightSidebar();
  }, [book.id, hideRightSidebar]);

  const sessionStartedAt = useRef(Date.now());
  const previousChapterKey = useRef<string | null>(null);
  const seenParagraphs = useRef<Set<string>>(new Set());

  const setStoreBook = useReaderStore((state) => state.setBook);
  const setElements = useReaderStore((state) => state.setElements);
  const setChapterId = useReaderStore((state) => state.setChapterId);
  const setElementId = useReaderStore((state) => state.setElementId);
  const readerConfig = useSettingsStore((state) => state.config?.reader);
  const settingsLoading = useSettingsStore((state) => state.loading);
  const settingsError = useSettingsStore((state) => state.error);


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
  const readerSidebarOpen = useLayoutStore((state) => state.rightSidebarVisible);
  const showRightSidebar = useLayoutStore((state) => state.showRightSidebar);
  const setSidebarSection = useReaderDisplayStore((state) => state.setSidebarSection);
  const textAlign = useReaderDisplayStore((state) => state.textAlign);
  const paragraphSpacing = useReaderDisplayStore((state) => state.paragraphSpacing);
  const saveFreePosition = useReaderDisplayStore((state) => state.saveFreePosition);
  const openReaderSettings = useCallback(() => {
    setSidebarSection("settings");
    showRightSidebar();
  }, [setSidebarSection, showRightSidebar]);

  const [positionReady, setPositionReady] = useState(false);
  const restoredBookIdRef = useRef<string | null>(null);
  const [freeReadingNavigation, setFreeReadingNavigation] = useState<FreeReadingNavigation | null>(null);
  const [visibleFreePosition, setVisibleFreePosition] = useState<{ chapterIndex: number; elementIndex: number } | null>(null);
  const registerFreeReadingNavigation = useCallback((navigation: FreeReadingNavigation | null) => {
    setFreeReadingNavigation(navigation);
  }, []);
  const restorePositionRef = useRef(restorePosition);
  restorePositionRef.current = restorePosition;

  useEffect(() => {
    // Wait for settings so we don't briefly restore a position that is disabled.
    if (
      settingsLoading ||
      (!readerConfig && !settingsError) ||
      restoredBookIdRef.current === book.id
    ) return;

    let active = true;
    setPositionReady(false);
    void Promise.all([
      readerConfig?.remember_position
        ? commands.getBookReadingPosition(book.id).catch(() => null)
        : Promise.resolve(null),
      commands.getBookExerciseEvents(book.id).catch(() => null),
    ]).then(([positionResult, eventResult]) => {
      if (!active) return;
      restoredBookIdRef.current = book.id;
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
  }, [book.id, book.chapters, readerConfig, restoreActivities, settingsError, settingsLoading]);

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

  const syncVisibleFreePosition = useCallback(() => {
    const position = getVisibleFreePosition();
    if (!position) return;

    setVisibleFreePosition((current) =>
      current?.chapterIndex === position.chapterIndex && current.elementIndex === position.elementIndex
        ? current
        : { chapterIndex: position.chapterIndex, elementIndex: position.elementIndex },
    );
  }, [getVisibleFreePosition]);

  const saveCurrentFreePosition = useCallback(() => {
    if (readerMode !== "free" || !readerConfig?.remember_position) return;
    const position = getVisibleFreePosition();
    if (position) saveFreePosition(book.id, position);
  }, [book.id, getVisibleFreePosition, readerConfig?.remember_position, readerMode, saveFreePosition]);

  const freePositionSaveTimer = useRef<number | null>(null);
  const freePositionFrame = useRef<number | null>(null);
  const scheduleFreePositionSave = useCallback(() => {
    if (readerMode !== "free") return;
    if (freePositionFrame.current === null) {
      freePositionFrame.current = window.requestAnimationFrame(() => {
        freePositionFrame.current = null;
        syncVisibleFreePosition();
      });
    }
    if (freePositionSaveTimer.current !== null) window.clearTimeout(freePositionSaveTimer.current);
    freePositionSaveTimer.current = window.setTimeout(() => {
      freePositionSaveTimer.current = null;
      saveCurrentFreePosition();
    }, 120);
  }, [readerMode, saveCurrentFreePosition, syncVisibleFreePosition]);

  useEffect(() => {
    if (readerMode !== "free") return;
    return () => {
      if (freePositionSaveTimer.current !== null) {
        window.clearTimeout(freePositionSaveTimer.current);
        freePositionSaveTimer.current = null;
      }
      if (freePositionFrame.current !== null) {
        window.cancelAnimationFrame(freePositionFrame.current);
        freePositionFrame.current = null;
      }
      saveCurrentFreePosition();
    };
  }, [readerMode, saveCurrentFreePosition]);

  useEffect(() => {
    if (readerMode !== "free" || !positionReady || !readerBoundary || !freeReadingNavigation) return;
    const position = readerConfig?.remember_position
      ? useReaderDisplayStore.getState().freePositions[book.id]
      : null;
    if (!position) {
      readerBoundary.scrollTop = 0;
      return;
    }
    freeReadingNavigation.scrollToPosition(position);
  }, [book.id, freeReadingNavigation, positionReady, readerBoundary, readerConfig?.remember_position, readerMode]);

  useEffect(() => {
    if (readerMode !== "free" || !positionReady || !readerBoundary || !freeReadingNavigation) return;
    const frame = window.requestAnimationFrame(syncVisibleFreePosition);
    return () => window.cancelAnimationFrame(frame);
  }, [freeReadingNavigation, positionReady, readerBoundary, readerMode, syncVisibleFreePosition]);

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

  const eventContextRef = useRef({
    chapterId: currentChapter.id,
    elementIndex: currentElementIndex,
  });
  eventContextRef.current = {
    chapterId: currentChapter.id,
    elementIndex: currentElementIndex,
  };

  const emitLearningEvent = useCallback((
    eventType: LearningEventType,
    payload: LearningEventData,
  ) => {
    if (readerMode !== "learning") return;
    const eventContext = eventContextRef.current;

    events.learningEvent.emit({
      id: crypto.randomUUID(),
      user_id: "0",
      event_type: eventType,
      timestamp: Date.now(),
      context: {
        book_id: book.id,
        chapter_id: eventContext.chapterId,
        element_id: eventContext.chapterId + "-" + eventContext.elementIndex,
        exercise_id: null,
        question_id: null,
        skill_id: null,
        word_id: null
      },
      data: payload,
    });
  }, [book.id, readerMode]);

  useEffect(() => {
    setStoreBook(book);
  }, [book, setStoreBook]);

  useEffect(() => {
    if (readerMode !== "learning" || !positionReady) return;
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
  }, [book.id, emitLearningEvent, positionReady, readerMode]);

  useEffect(() => {
    setElements(completedElements);
  }, [completedElements, setElements]);

  useEffect(() => {
    if (readerMode !== "learning") return;
    if (!positionReady) return;
    if (!currentChapter) {
      return;
    }

    const chapterKey = `${book.id}:${currentChapter.id}`;
    if (previousChapterKey.current === chapterKey) {
      return;
    }

    previousChapterKey.current = chapterKey;


    setElementId(`${currentChapter.id}-${currentElementIndex}`);
    emitLearningEvent("ChapterOpened", { type: "Empty" });
    setChapterId(currentChapter.id);
  }, [currentChapter, currentChapterIndex, currentElementIndex, emitLearningEvent, positionReady, readerMode]);

  useEffect(() => {
    if (readerMode !== "learning" || !positionReady || !currentChapter) return;
    setElementId(`${currentChapter.id}-${currentElementIndex}`);
    if (readerConfig?.remember_position) {
      void commands.saveBookReadingPosition(book.id, currentChapter.id, `${currentChapter.id}-${currentElementIndex}`);
    }
  }, [book.id, currentChapter, currentElementIndex, positionReady, readerConfig?.remember_position, readerMode, setElementId]);

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
    emitLearningEvent,
    readerMode,
  ]);

  const { onNextHandler, isAdvancing, advanceError } = useReaderNextHandler({
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
  });

  const speechPosition = readerMode === "free"
    ? visibleFreePosition
    : { chapterIndex: currentChapterIndex, elementIndex: currentElementIndex };
  const speechElement = readerMode === "free"
    ? speechPosition
      ? allChapterElements[speechPosition.chapterIndex]?.[speechPosition.elementIndex] ?? null
      : null
    : currentElement ?? null;

  const { controlRef, visible} = useControlsFocus(".reader")
  const { t } = useI18n();

  const readerHeader = useMemo(
    () => (
      <div className="h-1 w-full">
        <ReaderFocusControls
          visible={visible}
          ref={controlRef}
        />
      </div>
    ),
    [controlRef, visible],
  );

  const navigateToChapter = useCallback((chapterIndex: number) => {
    if (readerMode === "free") {
      freeReadingNavigation?.scrollToChapter(chapterIndex);
    } else {
      document.getElementById(`reader-chapter-${chapterIndex}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [freeReadingNavigation, readerMode]);

  const readerSidebar = useMemo(
    () => (
      <ReaderSidebar
        chapters={book.chapters}
        activeChapterIndex={currentChapterIndex}
        onNavigateToChapter={navigateToChapter}
      />
    ),
    [book.chapters, currentChapterIndex, navigateToChapter],
  );

  useReaderLayout({ header: readerHeader, rightSidebar: readerSidebar });

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
                          position={element}
                        />
                      ))}
                    </section>)
                  )}
                </>
              :
              <FreeReadingView
                content={{
                  chapters: book.chapters,
                  chapterElements: allChapterElements,
                  paragraphSpacing,
                }}
                viewport={{
                  scrollElement: readerBoundary,
                  selection,
                }}
                onNavigationReady={registerFreeReadingNavigation}
              />
            }
          </div>
          <TranslationPopover collisionBoundary={readerBoundary} />
          </div>
          <ReaderActions
            current={{
              bookId: book.id,
              element: speechElement,
              chapterIndex: speechPosition?.chapterIndex ?? currentChapterIndex,
              elementIndex: speechPosition?.elementIndex ?? currentElementIndex,
            }}
            onNext={onNextHandler}
            navigation={{
              isAdvancing,
              progress: elements.length > 0 ? (currentElementIndex / elements.length) * 100 : 0,
              canAdvance: readerMode === "learning",
            }}
          />
        </div>


      </div>

      {!readerSidebarOpen && (
        <button
          type="button"
          aria-label={t("reader.settings")}
          title={t("reader.settings")}
          data-reader-sidebar-trigger="true"
          onClick={openReaderSettings}
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
}
