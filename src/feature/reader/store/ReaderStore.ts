import { Book } from "@/entities/book/book.type";
import { create } from "zustand";
import { VisibleElement } from "../hooks/useReader";

interface ReaderStore {
  book: Book | null;
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
}

export const useReaderStore =
  create<
    ReaderStore & ReaderActions
  >((set) => ({
    book: null,
    elements: [],
    translation: "",
    selectedIds: [],

    setSelectedIds: (
      selectedIds,
    ) =>
      set({ selectedIds }),

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
  }));