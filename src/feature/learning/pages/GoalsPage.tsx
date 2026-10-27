import { useState } from "react";
import { Input } from "#ui/input";
import { useI18n } from "@/shared/i18n";
import { LearningPageFrame } from "../components/LearningPageFrame";
import { useLearningOverview } from "../hooks/useLearningOverview";

const readGoal = (key: string, fallback: number) => Number(localStorage.getItem(key) ?? fallback);

export function GoalsPage() {
  const { data, error } = useLearningOverview();
  const { t } = useI18n();
  const [wordGoal, setWordGoal] = useState(() => readGoal("langi.goal.words", 20));
  const [chapterGoal, setChapterGoal] = useState(() => readGoal("langi.goal.chapters", 5));
  const masteredWords = (data?.words ?? []).filter((word) => word.state === "Mastered").length;
  const completedChapters = (data?.books ?? []).reduce((total, book) => total + book.chapters_completed, 0);

  const renderGoal = (label: string, value: number, setValue: (value: number) => void, current: number, key: string) => (
    <section key={key} className="surface space-y-3 p-5">
      <label className="flex flex-wrap items-center justify-between gap-3 font-medium">
        <span>{label}</span>
        <Input className="w-28" type="number" min={1} value={value} onChange={(event) => {
          const nextValue = Math.max(1, Number(event.target.value) || 1);
          setValue(nextValue);
          localStorage.setItem(key, String(nextValue));
        }} />
      </label>
      <div className="flex justify-between text-sm text-muted-foreground"><span>{t("goals.progress")}</span><span>{current} / {value}</span></div>
      <div className="h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${Math.min(100, Math.round(current / value * 100))}%` }} /></div>
    </section>
  );

  return (
    <LearningPageFrame title={t("goals.title")} subtitle={t("goals.subtitle")}>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {renderGoal(t("goals.words"), wordGoal, setWordGoal, masteredWords, "langi.goal.words")}
        {renderGoal(t("goals.chapters"), chapterGoal, setChapterGoal, completedChapters, "langi.goal.chapters")}
      </div>
      <p className="text-sm text-muted-foreground">{t("goals.save")}</p>
    </LearningPageFrame>
  );
}
