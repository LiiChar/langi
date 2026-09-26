import { create } from "zustand";

export type ReaderPosition = {
  chapterIndex: number;
  elementIndex: number;
  wordIndex: number;
};

export type TranslationTarget =
  | {
      type: "word";
      position: ReaderPosition;
      text: string;
    }
  | {
      type: "sentence";
      elementIndex: number;
      text: string;
    }
  | {
      type: "selection";
      start: ReaderPosition;
      end: ReaderPosition;
      text: string;
    };

export type TranslationStatus =
  | "idle"
  | "loading"
  | "success"
  | "error";

type TranslationStore = {
  target: TranslationTarget | null;

  anchorId: string | null;

  status: TranslationStatus;
  translation: string | null;
  error: string | null;

  requestId: number;

  open: (
    target: TranslationTarget,
  ) => number;

  setTranslation: (
    requestId: number,
    translation: string,
  ) => void;

  setError: (
    requestId: number,
    error?: string,
  ) => void;

  close: () => void;
};

export const useTranslationStore =
  create<TranslationStore>((set, get) => ({
    target: null,
    anchorId: null,

    status: "idle",
    translation: null,
    error: null,

    requestId: 0,

    open: (target) => {
      const requestId =
        get().requestId + 1;

      set({
        target,
        status: "loading",
        translation: null,
        error: null,
        requestId,
      });

      return requestId;
    },

    setTranslation: (
      requestId,
      translation,
    ) => {
      if (
        get().requestId !== requestId
      ) {
        return;
      }

      set({
        status: "success",
        translation,
        error: null,
      });
    },

    setError: (
      requestId,
      error = "Не удалось получить перевод",
    ) => {
      if (
        get().requestId !== requestId
      ) {
        return;
      }

      set({
        status: "error",
        translation: null,
        error,
      });
    },

    close: () => {
      set((state) => ({
        target: null,
        status: "idle",
        translation: null,
        error: null,
        requestId:
          state.requestId + 1,
      }));
    },
  }));