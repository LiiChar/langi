import { Button } from "#ui/button";
import { Play, Volume2, VolumeOff } from "lucide-react";
import { useReaderSpeech } from "../../hooks/useReaderSpeech";
import { ContentElement } from "../../lib/paragraph";
import { useI18n } from "@/shared/i18n";

export type ReaderActionTarget = {
  bookId: string;
  element: ContentElement | null;
  chapterIndex: number;
  elementIndex: number;
};

export type ReaderActionsProps = {
  current: ReaderActionTarget;
  onNext: () => void;
  navigation: {
    isAdvancing: boolean;
    progress: number;
    canAdvance: boolean;
  };
}

export const ReaderActions = ({ current, onNext, navigation }: ReaderActionsProps) => {
  const { t } = useI18n();

  const { speaking, error: speechError, toggle: toggleSpeech } = useReaderSpeech(current);

  return (
    <div className="absolute bottom-2 right-3 z-10 flex max-w-[calc(100%-1.5rem)] items-center gap-2">
      {speechError &&
        <span role="alert" className="max-w-72 truncate text-xs text-destructive">
          {speechError}
        </span>
      }

        <Button variant="outline"
          size="icon"
          aria-label={speaking ? t("reader.stopSpeech") : t("reader.startSpeech")}
          onClick={() => void toggleSpeech()}
        >
          {speaking
            ? <Volume2 />
            : <VolumeOff />
          }
        </Button>
        {navigation.canAdvance && <div
          className="relative grid size-10 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(
              from 0,
              var(--primary) ${Math.min(100, Math.max(0, navigation.progress))}%,
              transparent ${Math.min(100, Math.max(0, navigation.progress))}%
            )`,
          }}
        >
          <Button
            disabled={navigation.isAdvancing}
            onClick={onNext}
            className="relative z-10 size-9 rounded-full bg-primary! hover:bg-primary!"
            size="icon"
          >
            <Play />
            <span className="sr-only">{t("reader.continue")}</span>
          </Button>
        </div>}
    </div>
  )
}
