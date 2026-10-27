import { useCallback } from "react";

import { commands } from "@/shared/commands/bindings";

import {
  TranslationTarget,
  useTranslationStore,
} from "../store/TranslationStore";

export const useReaderTranslation = () => {
  const open = useTranslationStore(
    (state) => state.open,
  );

  const setTranslation =
    useTranslationStore(
      (state) => state.setTranslation,
    );

  const setError =
    useTranslationStore(
      (state) => state.setError,
    );

  const translate = useCallback(
    async (
      target: TranslationTarget,
    ) => {
      const requestId =
        open(target);

      try {
        const result =
          await commands.translate(
            "",
            "",
            target.text,
          );

        if (
          result.status === "error"
        ) {
          setError(
            requestId,
            result.error ||
              "Не удалось получить перевод",
          );

          return;
        }

        setTranslation(
          requestId,
          result.data,
        );
      } catch (error) {
        setError(
          requestId,
          error instanceof Error
            ? error.message
            : "Не удалось получить перевод",
        );
      }
    },
    [
      open,
      setTranslation,
      setError,
    ],
  );

  return {
    translate,
  };
};
