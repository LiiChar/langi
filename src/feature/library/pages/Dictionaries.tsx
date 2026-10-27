import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "#ui/button";
import { commands, type WikDictPair } from "@/shared/commands/bindings";
import { useI18n } from "@/shared/i18n";
import { PageHeading } from "#ui/page-heading";

const languageNames: Record<string, string> = {
  en: "Английский", ru: "Русский", de: "Немецкий", fr: "Французский", es: "Испанский",
  it: "Итальянский", ja: "Японский", zh: "Китайский", pt: "Португальский", nl: "Нидерландский",
  pl: "Польский", sv: "Шведский", no: "Норвежский", da: "Датский", fi: "Финский",
  cs: "Чешский", el: "Греческий", tr: "Турецкий", bg: "Болгарский", ca: "Каталанский",
  ga: "Ирландский", id: "Индонезийский", ku: "Курдский", la: "Латынь", lt: "Литовский",
  mg: "Малагасийский",
};

export function DictionariesPage() {
  const { t } = useI18n();
  const [languages, setLanguages] = useState<string[]>([]);
  const [installed, setInstalled] = useState<WikDictPair[]>([]);
  const [from, setFrom] = useState("en");
  const [to, setTo] = useState("ru");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [languageList, dictionaries] = await Promise.all([
        commands.getWikdictLanguages(),
        commands.getWikdictDictionaries(),
      ]);
      setLanguages(languageList);
      if (dictionaries.status === "error") setError(dictionaries.error || "Не удалось получить список словарей");
      else setInstalled(dictionaries.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить список WikDict");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const isInstalled = installed.some((dictionary) => dictionary.from === from && dictionary.to === to);

  const download = async () => {
    setDownloading(true);
    setError(null);
    try {
      const result = await commands.downloadWikdictDictionary(from, to);
      if (result.status === "error") setError(result.error || "Не удалось скачать словарь");
      else await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось скачать словарь");
    } finally {
      setDownloading(false);
    }
  };

  return <div className="window gap-5 p-3">
    <PageHeading title={t("dict.title")} description={t("dict.subtitle")} />

    <section className="surface space-y-4 p-5">
      <h2 className="text-lg font-semibold">{t("dict.download")}</h2>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">{t("dict.source")}</span>
          <select aria-label="Исходный язык словаря" className="h-10 w-full rounded-xl border bg-background px-3" value={from} onChange={(event) => { const nextFrom = event.target.value; setFrom(nextFrom); if (to === nextFrom) setTo(languages.find((language) => language !== nextFrom) ?? "ru"); }}>
            {languages.map((language) => <option key={language} value={language}>{languageNames[language] ?? language} ({language})</option>)}
          </select>
        </label>
        <span className="hidden pb-2 text-muted-foreground sm:block">→</span>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">{t("dict.target")}</span>
          <select aria-label="Язык перевода словаря" className="h-10 w-full rounded-xl border bg-background px-3" value={to} onChange={(event) => setTo(event.target.value)}>
            {languages.filter((language) => language !== from).map((language) => <option key={language} value={language}>{languageNames[language] ?? language} ({language})</option>)}
          </select>
        </label>
        <Button disabled={loading || downloading || isInstalled || from === to} onClick={() => void download()}>
          {downloading ? <><Loader2 className="animate-spin" />{t("dict.downloading")}</> : isInstalled ? t("dict.downloaded") : <><Download />{t("dict.download")}</>}
        </Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>

    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("dict.installed")}</h2>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>{loading ? t("common.loading") : t("dict.refresh")}</Button>
      </div>
      {installed.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">{loading ? t("common.loading") : t("dict.empty")}</p> :
        <ul className="grid gap-2 sm:grid-cols-2">
          {installed.map((dictionary) => <li key={`${dictionary.from}-${dictionary.to}`} className="rounded-xl border bg-background px-4 py-3 text-sm">
            {languageNames[dictionary.from] ?? dictionary.from} → {languageNames[dictionary.to] ?? dictionary.to}
          </li>)}
        </ul>}
    </section>
  </div>;
}
