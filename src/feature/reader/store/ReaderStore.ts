import { Book } from "@/entities/book/book.type";
import { create } from "zustand"


interface ReaderStore {
  book: Book | null;
  translation: string;

  selectedStart: string | null;
  selectedEnd: string | null;
}

interface ReaderActions {
  setSelectedStart: (selectedStart: string | null) => void;
  setSelectedEnd: (selectedEnd: string | null) => void;
  setTranslation: (translation: string) => void;
  setBook: (book: Book | null) => void;
}

export const useReaderStore = create<ReaderStore & ReaderActions>((set) => ({
  book: null,
  translation: "",
  selectedStart: null,
  selectedEnd: null,

  setSelectedStart: (selectedStart) => set({ selectedStart }),
  setSelectedEnd: (selectedEnd) => set({ selectedEnd }),
  setTranslation: (translation) => set({ translation }),
  setBook: (book) => set({ book }),
}))
