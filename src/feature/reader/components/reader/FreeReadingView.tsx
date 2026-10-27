import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Chapter } from "@/entities/book/book.type";
import { ContentRenderer } from "../elements/ContentRenderer";
import type { useReaderSelection } from "../../hooks/useReaderSelection";
import type { ContentElement } from "../../lib/paragraph";
import type { FreeReadingPosition } from "../../store/ReaderDisplayStore";
import { useI18n } from "@/shared/i18n";

type FreeReadingNavigation = {
  scrollToChapter: (chapterIndex: number) => void;
  scrollToPosition: (position: FreeReadingPosition) => void;
};

type FreeReadingViewProps = {
  chapters: Chapter[];
  chapterElements: ContentElement[][];
  scrollElement: HTMLDivElement | null;
  paragraphSpacing: number;
  selection: ReturnType<typeof useReaderSelection>;
  onNavigationReady: (navigation: FreeReadingNavigation | null) => void;
};

type FreeReadingRow =
  | { type: "chapter"; key: string; chapterIndex: number }
  | { type: "element"; key: string; chapterIndex: number; elementIndex: number; element: ContentElement };

export function FreeReadingView({ chapters, chapterElements, scrollElement, paragraphSpacing, selection, onNavigationReady }: FreeReadingViewProps) {
  const { t } = useI18n();
  const { rows, chapterRowIndices, positionRowIndices } = useMemo(() => {
    const rows: FreeReadingRow[] = [];
    const chapterRowIndices: number[] = [];
    const positionRowIndices = new Map<string, number>();

    chapterElements.forEach((elements, chapterIndex) => {
      chapterRowIndices[chapterIndex] = rows.length;
      rows.push({ type: "chapter", key: `chapter:${chapterIndex}`, chapterIndex });
      elements.forEach((element, elementIndex) => {
        positionRowIndices.set(`${chapterIndex}:${elementIndex}`, rows.length);
        rows.push({ type: "element", key: `${chapterIndex}:base:${elementIndex}`, chapterIndex, elementIndex, element });
      });
    });

    return { rows, chapterRowIndices, positionRowIndices };
  }, [chapterElements]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElement,
    initialRect: {
      width: scrollElement?.clientWidth || 800,
      height: scrollElement?.clientHeight || 600,
    },
    estimateSize: (index) => rows[index]?.type === "chapter" ? 84 : 112,
    getItemKey: (index) => rows[index]?.key ?? index,
    overscan: 8,
  });
  const pendingPositionRef = useRef<{ position: FreeReadingPosition; exact: boolean } | null>(null);

  useLayoutEffect(() => {
    const pending = pendingPositionRef.current;
    if (!pending || !scrollElement) return;
    const target = pending.exact
      ? scrollElement.querySelector<HTMLElement>(`[data-reader-content="${pending.position.chapterIndex}-${pending.position.elementIndex}"]`)
      : scrollElement.querySelector<HTMLElement>(`#reader-chapter-${pending.position.chapterIndex}`);
    if (!target) return;
    const targetTop = target.getBoundingClientRect().top;
    const containerTop = scrollElement.getBoundingClientRect().top;
    scrollElement.scrollTop += targetTop - containerTop - (pending.exact ? pending.position.offset : 0);
    pendingPositionRef.current = null;
  });

  const scrollToChapter = useCallback((chapterIndex: number) => {
    const rowIndex = chapterRowIndices[chapterIndex];
    if (rowIndex !== undefined) virtualizer.scrollToIndex(rowIndex, { align: "start", behavior: "smooth" });
  }, [chapterRowIndices, virtualizer]);

  const scrollToPosition = useCallback((position: FreeReadingPosition) => {
    const exactRowIndex = positionRowIndices.get(`${position.chapterIndex}:${position.elementIndex}`);
    const rowIndex = exactRowIndex ?? chapterRowIndices[position.chapterIndex];
    if (rowIndex === undefined || !scrollElement) return;
    pendingPositionRef.current = { position, exact: exactRowIndex !== undefined };
    virtualizer.scrollToIndex(rowIndex, { align: "start" });
  }, [chapterRowIndices, positionRowIndices, scrollElement, virtualizer]);

  useEffect(() => {
    onNavigationReady({ scrollToChapter, scrollToPosition });
    return () => onNavigationReady(null);
  }, [onNavigationReady, scrollToChapter, scrollToPosition]);

  const virtualRows = virtualizer.getVirtualItems();
  const firstVirtualRow = virtualRows[0];
  const lastVirtualRow = virtualRows[virtualRows.length - 1];
  const totalSize = virtualizer.getTotalSize();

  return <div className="w-full">
    {firstVirtualRow && firstVirtualRow.start > 0 && <div aria-hidden="true" style={{ height: firstVirtualRow.start }} />}
    {virtualRows.map((virtualRow) => {
      const row = rows[virtualRow.index];
      if (!row) return null;
      return <div
        key={virtualRow.key}
        data-index={virtualRow.index}
        ref={virtualizer.measureElement}
        className="w-full"
        style={{
          paddingTop: row.type === "chapter" && row.chapterIndex > 0 ? "2rem" : undefined,
          paddingBottom: row.type === "chapter" ? "1rem" : `${paragraphSpacing}rem`,
        }}
      >
        {row.type === "chapter" ? <section id={`reader-chapter-${row.chapterIndex}`} className="scroll-mt-4">
          <h2 className="border-b pb-2 text-2xl font-semibold">{chapters[row.chapterIndex]?.title || `${t("reader.chapter")} ${row.chapterIndex + 1}`}</h2>
        </section> : <ContentRenderer
          element={row.element}
          selection={selection}
          chapterIndex={row.chapterIndex}
          elementIndex={row.elementIndex}
        />}
      </div>;
    })}
    {lastVirtualRow && lastVirtualRow.end < totalSize && <div aria-hidden="true" style={{ height: totalSize - lastVirtualRow.end }} />}
  </div>;
}

export type { FreeReadingNavigation };
