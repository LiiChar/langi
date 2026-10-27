import { useEffect, useState } from "react";
import { Button } from "#ui/button";
import { commands } from "@/shared/commands/bindings";
import { useSettingsStore } from "@/shared/store/SettingsStore";
import { useI18n } from "@/shared/i18n";
import { LearningPageFrame } from "../components/LearningPageFrame";
import { emitWordEvent } from "../lib/learningEvents";
import { useLearningOverview } from "../hooks/useLearningOverview";

export function ReviewPage() {
  const { data, loading, error, reload } = useLearningOverview();
  const { t } = useI18n();
  const config = useSettingsStore((state) => state.config);
  const dueWords = (data?.words ?? []).filter((word) => word.state !== "Mastered" && word.state !== "Suspended" && (!word.next_review_at || word.next_review_at <= Date.now()));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [translation, setTranslation] = useState("");
  const word = dueWords[index];

  useEffect(() => { setRevealed(false); setTranslation(""); }, [index]);

  const reveal = async () => {
    if (!word) return;
    setRevealed(true);
    const result = await commands.translate(
      config?.translate.source_language ?? "en",
      config?.translate.target_language ?? "ru",
      word.word_id,
    );
    if (result.status === "ok") setTranslation(result.data);
  };

  const answer = async (known: boolean) => {
    if (!word) return;
    await emitWordEvent(word.word_id, known ? "MarkedKnown" : "MarkedUnknown");
    setIndex((current) => current + 1);
    await reload();
  };

  return (
    <LearningPageFrame title={t("review.title")} subtitle={t("review.subtitle")}>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading ? <p className="text-muted-foreground">{t("review.loading")}</p>
        : word ? <div className="surface mx-auto w-full max-w-xl space-y-5 p-6 text-center">
          <p className="text-sm text-muted-foreground">{t("review.remaining")}: {dueWords.length - index}</p>
          <div className="py-10 text-4xl font-semibold">{word.word_id}</div>
          {revealed ? <p className="text-xl">{translation || t("vocab.noTranslation")}</p> : <Button onClick={() => void reveal()}>{t("review.reveal")}</Button>}
          {revealed && <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => void answer(false)}>{t("review.unknown")}</Button>
            <Button onClick={() => void answer(true)}>{t("review.known")}</Button>
          </div>}
        </div> : <p className="surface p-6 text-muted-foreground">{t("review.done")}</p>}
    </LearningPageFrame>
  );
}
