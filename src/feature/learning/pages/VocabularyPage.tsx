import { useMemo, useState } from "react";
import { Button } from "#ui/button";
import { Input } from "#ui/input";
import { useI18n } from "@/shared/i18n";
import { LearningPageFrame } from "../components/LearningPageFrame";
import { emitWordEvent } from "../lib/learningEvents";
import { useLearningOverview } from "../hooks/useLearningOverview";

type VocabularyFilter = "all" | "favorite" | "due";

export function VocabularyPage() {
  const { data, loading, error, reload } = useLearningOverview();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<VocabularyFilter>("all");

  const words = useMemo(() => (data?.words ?? []).filter((word) => {
    const matchesQuery = word.word_id.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "all"
      || (filter === "favorite" && word.favorite)
      || (filter === "due" && (!word.next_review_at || word.next_review_at <= Date.now()));
    return matchesQuery && matchesFilter;
  }), [data, filter, query]);

  const toggleFavorite = async (wordId: string, isFavorite: boolean) => {
    await emitWordEvent(wordId, isFavorite ? "FavoriteRemoved" : "FavoriteAdded");
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    await reload();
  };

  return (
    <LearningPageFrame title={t("vocab.title")} subtitle={t("vocab.subtitle")}>
      <div className="flex flex-wrap gap-2">
        <Input className="max-w-sm" placeholder={t("vocab.search")} value={query} onChange={(event) => setQuery(event.target.value)} />
        {(["all", "favorite", "due"] as const).map((value) => {
          const labels = { all: "vocab.all", favorite: "vocab.favorite", due: "vocab.due" } as const;
          return <Button key={value} size="sm" variant={filter === value ? "default" : "outline"} onClick={() => setFilter(value)}>{t(labels[value])}</Button>;
        })}
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading ? <p className="text-muted-foreground">{t("vocab.loading")}</p>
        : words.length ? <div className="surface divide-y divide-border overflow-hidden">
          {words.map((word) => <div key={word.word_id} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="font-medium">{word.word_id}</div>
              <div className="text-xs text-muted-foreground">{word.state} · {Math.round(word.familiarity * 100)}% · {word.exposure_count}×</div>
            </div>
            <Button variant="ghost" aria-label={t("vocab.favoriteAction")} onClick={() => void toggleFavorite(word.word_id, word.favorite)}>{word.favorite ? "★" : "☆"}</Button>
          </div>)}
        </div> : <p className="surface p-6 text-muted-foreground">{t("vocab.empty")}</p>}
    </LearningPageFrame>
  );
}
