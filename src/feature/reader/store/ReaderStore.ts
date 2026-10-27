import { Book } from "@/entities/book/book.type";
import { create } from "zustand";
import { VisibleElement } from "../hooks/useReader";

interface ReaderStore {
  book: Book | null;
  chapterId: string;
  elementId: string;
  elements: VisibleElement[];
  translation: string;
  selectedIds: string[];
}

interface ReaderActions {
  setSelectedIds: (
    selectedIds: string[],
  ) => void;

  setTranslation: (
    translation: string,
  ) => void;

  setBook: (
    book: Book | null,
  ) => void;

  setElements: (
    elements: VisibleElement[],
  ) => void;

  setChapterId: (
    chapterId: string,
  ) => void;

  setElementId: (
    elementId: string,
  ) => void;
}

export const useReaderStore =
  create<
    ReaderStore & ReaderActions
  >((set) => ({
    book: null,
    chapterId: "",
    elementId: "",
    elements: [],
    translation: "",
    selectedIds: [],

    setSelectedIds: (
      selectedIds,
    ) =>
      set((state) =>
        state.selectedIds.length === selectedIds.length &&
        state.selectedIds.every((id, index) => id === selectedIds[index])
          ? state
          : { selectedIds },
      ),

    setTranslation: (
      translation,
    ) =>
      set({ translation }),

    setBook: (book) =>
      set({ book }),

    setElements: (
      elements,
    ) =>
      set({ elements }),

    setChapterId: (
      chapterId,
    ) =>
      set({ chapterId }),
    setElementId: (
      elementId,
    ) =>
      set({ elementId }),
  }));
