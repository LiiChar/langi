import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ReaderMode = "learning" | "free";
export type ReaderTextAlign = "left" | "justify";
export type ReaderSidebarSection = "settings" | "chapters";

export interface FreeReadingPosition {
  chapterIndex: number;
  elementIndex: number;
  offset: number;
}

interface ReaderDisplayState {
  mode: ReaderMode;
  textAlign: ReaderTextAlign;
  paragraphSpacing: number;
  freePositions: Record<string, FreeReadingPosition>;
  sidebarOpen: boolean;
  sidebarSection: ReaderSidebarSection;
  setMode: (mode: ReaderMode) => void;
  setTextAlign: (textAlign: ReaderTextAlign) => void;
  setParagraphSpacing: (paragraphSpacing: number) => void;
  saveFreePosition: (bookId: string, position: FreeReadingPosition) => void;
  openSidebar: (section?: ReaderSidebarSection) => void;
  closeSidebar: () => void;
  setSidebarSection: (section: ReaderSidebarSection) => void;
}

export const useReaderDisplayStore = create<ReaderDisplayState>()(persist((set) => ({
  mode: "learning",
  textAlign: "left",
  paragraphSpacing: 0.25,
  freePositions: {},
  sidebarOpen: false,
  sidebarSection: "settings",
  setMode: (mode) => set({ mode }),
  setTextAlign: (textAlign) => set({ textAlign }),
  setParagraphSpacing: (paragraphSpacing) => set({ paragraphSpacing }),
  saveFreePosition: (bookId, position) => set((state) => ({ freePositions: { ...state.freePositions, [bookId]: position } })),
  openSidebar: (section = "settings") => set({ sidebarOpen: true, sidebarSection: section }),
  closeSidebar: () => set({ sidebarOpen: false }),
  setSidebarSection: (sidebarSection) => set({ sidebarSection, sidebarOpen: true }),
}), { name: "langi.reader.display", partialize: (state) => ({
  mode: state.mode,
  textAlign: state.textAlign,
  paragraphSpacing: state.paragraphSpacing,
  freePositions: state.freePositions,
}) as ReaderDisplayState }));
