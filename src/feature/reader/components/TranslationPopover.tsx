import { Popover } from "@base-ui/react/popover";

import {
  useTranslationStore,
} from "../store/TranslationStore";
import { RefObject } from "react";

type TranslationPopoverProps = {
  collisionBoundary:
    | HTMLElement
    | null;
};

export const translationPopover =
  Popover.createHandle();

export const TranslationPopover = ({ collisionBoundary }: TranslationPopoverProps) => {
  const status = useTranslationStore(
    (state) => state.status,
  );

  const translation =
    useTranslationStore(
      (state) => state.translation,
    );

  const error = useTranslationStore(
    (state) => state.error,
  );

  return (
    <Popover.Root
      handle={translationPopover}
      onOpenChange={(open, eventDetails) => {
        console.log("[TranslationPopover]", {
          open,
          reason: eventDetails.reason,
          trigger: eventDetails.trigger?.id,
        });

        /*
         * Trigger не должен самостоятельно
         * переключать состояние popup.
         *
         * Мы управляем открытием вручную:
         *
         * translationPopover.open(wordId)
         */
        if (
          eventDetails.reason ===
          "trigger-press"
        ) {
          eventDetails.cancel();
          return;
        }

        /*
         * Не даём Base UI закрывать popup
         * из-за потери focus.
         *
         * Для reader это особенно важно,
         * потому что selection + async translation
         * меняют DOM/focus.
         */
        if (
          eventDetails.reason ===
          "focus-out"
        ) {
          eventDetails.cancel();
          return;
        }

        /*
         * imperative-action = наш
         * translationPopover.open().
         *
         * Ничего не делаем.
         */
        if (
          eventDetails.reason ===
          "imperative-action"
        ) {
          return;
        }

        /*
         * ВАЖНО:
         * здесь больше НЕ вызываем close().
         *
         * Закрытие Popover и состояние перевода
         * теперь независимы.
         */
      }}
    >
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          sideOffset={8}
          collisionBoundary={collisionBoundary ?? undefined}
          collisionAvoidance={{
            side: "shift",
            align: "shift",
            fallbackAxisSide: "none",
          }}
          collisionPadding={8}
        >
          <Popover.Popup
            className="
              z-50
              w-fit
              min-w-[80px]
              max-w-[360px]
              rounded-lg
              border
              bg-popover
              p-3
              text-popover-foreground
              shadow-md
              outline-none
            "
          >
            <Popover.Arrow />

            <Popover.Viewport>
              <div className="relative min-w-0">
                {status === "loading" && (
                  <div
                    className="
                      flex
                      items-center
                      gap-2
                      text-sm
                    "
                  >
                    <div
                      className="
                        h-3.5
                        w-3.5
                        shrink-0
                        animate-spin
                        rounded-full
                        border-2
                        border-muted
                        border-t-foreground
                      "
                    />

                    <span className="text-muted-foreground">
                      Перевод...
                    </span>
                  </div>
                )}

                {status === "success" &&
                  translation && (
                    <div
                      className="
                        break-words
                        whitespace-pre-wrap
                        text-sm
                        leading-5
                      "
                    >
                      {translation}
                    </div>
                  )}

                {status === "error" &&
                  error && (
                    <div
                      className="
                        break-words
                        text-sm
                        text-destructive
                      "
                    >
                      {error}
                    </div>
                  )}
              </div>
            </Popover.Viewport>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};