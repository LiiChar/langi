import { useI18n } from "@/shared/i18n";
import { LearningPageFrame } from "../components/LearningPageFrame";
import { useLearningOverview } from "../hooks/useLearningOverview";

export function StatisticsPage() {
  const { data, loading, error } = useLearningOverview();
  const { t } = useI18n();
  const progress = data?.books ?? [];
  const masteredWords = (data?.words ?? []).filter((word) => word.state === "Mastered").length;
  const readingMinutes = progress.length
    ? Math.round(progress.reduce((total, book) => total + book.reading_seconds, 0) / 60)
    : 0;
  const stats: Array<[string, number]> = [
    [t("stats.books"), progress.length],
    [t("stats.chapters"), progress.reduce((total, book) => total + book.chapters_started, 0)],
    [t("stats.finished"), progress.reduce((total, book) => total + book.chapters_completed, 0)],
    [t("stats.minutes"), readingMinutes],
    [t("stats.paragraphs"), progress.reduce((total, book) => total + book.paragraphs_seen, 0)],
    [t("stats.known"), masteredWords],
  ];

  return (
    <LearningPageFrame title={t("stats.title")} subtitle={t("stats.subtitle")}>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading ? <p>{t("stats.loading")}</p> : <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map(([label, value]) => <div key={label} className="surface p-5">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="mt-2 text-3xl font-semibold">{value}</div>
          </div>)}
        </div>
        <section className="surface space-y-2 p-5">
          <h2 className="font-semibold">{t("stats.skills")}</h2>
          {data?.skills.length ? data.skills.map((skill) => <div key={skill.name} className="space-y-1">
            <div className="flex justify-between text-sm"><span>{skill.name}</span><span>{Math.round(skill.mastery * 100)}%</span></div>
            <div className="h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${Math.round(skill.mastery * 100)}%` }} /></div>
          </div>) : <p className="text-sm text-muted-foreground">{t("stats.empty")}</p>}
        </section>
      </>}
    </LearningPageFrame>
  );
}
