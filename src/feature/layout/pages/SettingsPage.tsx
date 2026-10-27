import { useEffect } from "react";
import { Button } from "#ui/button";
import { SettingNumber, SettingRange, SettingSelect, SettingText, SettingToggle } from "#ui/setting-fields";
import { useSettingsStore } from "@/shared/store/SettingsStore";
import { commands, type Config } from "@/shared/commands/bindings";
import { useI18n } from "@/shared/i18n";
import { useReaderDisplayStore, type ReaderMode, type ReaderTextAlign } from "@/feature/reader/store/ReaderDisplayStore";
import { PageHeading } from "#ui/page-heading";
import { updateConfigSection } from "@/shared/lib/updateConfigSection";

export function SettingsPage() {
  const { config, loading, error, load } = useSettingsStore();
  const { t } = useI18n();
  const readerMode = useReaderDisplayStore((state) => state.mode);
  const setReaderMode = useReaderDisplayStore((state) => state.setMode);
  const textAlign = useReaderDisplayStore((state) => state.textAlign);
  const setTextAlign = useReaderDisplayStore((state) => state.setTextAlign);
  const paragraphSpacing = useReaderDisplayStore((state) => state.paragraphSpacing);
  const setParagraphSpacing = useReaderDisplayStore((state) => state.setParagraphSpacing);
  useEffect(() => { void load(); }, [load]);
  const updateGeneral = (patch: Partial<Config["general"]>) => updateConfigSection("general", patch);
  if (loading && !config) return <div className="p-8 text-muted-foreground">{t("settings.loading")}</div>;
  if (!config) return <div className="window p-8"><p className="text-destructive">{error ?? t("common.error")}</p><Button className="mt-4" onClick={() => void load()}>{t("settings.retry")}</Button></div>;
  const toggle = (label: string, checked: boolean, onChange: (value: boolean) => void) => <SettingToggle key={label} label={label} checked={checked} onChange={onChange} />;
  const number = (label: string, value: number, onChange: (value: number) => void, min = 1, max = 5000) => <SettingNumber key={label} label={label} value={value} onChange={onChange} min={min} max={max} />;
  const select = (label: string, value: string, options: [string, string][], onChange: (v: string) => void) => <SettingSelect key={label} label={label} value={value} options={options} onChange={onChange} />;
  const card = (title: string, children: React.ReactNode) => <section className="surface space-y-3 p-4 md:p-5"><h2 className="text-lg font-semibold">{title}</h2><div className="space-y-2">{children}</div></section>;
  const updateReader = (patch: Partial<Config["reader"]>) => updateConfigSection("reader", patch);
  const updateTranslate = (patch: Partial<Config["translate"]>) => updateConfigSection("translate", patch);
  const updateLearning = (patch: Partial<Config["learning"]>) => updateConfigSection("learning", patch);
  const updateDownload = (patch: Partial<Config["download"]>) => updateConfigSection("download", patch);
  return <div className="window gap-6 p-5 md:p-8">
    <PageHeading title={t("settings.title")} description={t("settings.subtitle")} />
    {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <div className="grid gap-4 lg:grid-cols-2">
      {card(t("settings.general"), <>
        {select(t("settings.language"), config.general.language, [["ru", "Русский"], ["en", "English"]], (language) => updateGeneral({ language }))}
        <SettingText label={t("settings.dataDir")} inputClassName="max-w-[60%]" value={config.general.data_dir} onChange={(data_dir) => updateGeneral({ data_dir })} />
        <SettingText label={t("settings.cacheDir")} inputClassName="max-w-[60%]" value={config.general.cache_dir} onChange={(cache_dir) => updateGeneral({ cache_dir })} />
        {toggle(t("settings.autoUpdate"), config.general.auto_update, (auto_update) => updateGeneral({ auto_update }))}
        {toggle(t("settings.telemetry"), config.general.telemetry_enabled, (telemetry_enabled) => updateGeneral({ telemetry_enabled }))}
        {select(t("settings.logLevel"), config.general.log_level, [["Error","Error"],["Warn","Warn"],["Info","Info"],["Debug","Debug"],["Trace","Trace"]], (log_level) => updateGeneral({ log_level: log_level as Config["general"]["log_level"] }))}
      </>)}
      {card(t("settings.reader"), <>
        {select(t("settings.readerMode"), readerMode, [["learning", t("reader.learningMode")], ["free", t("reader.freeMode")]], (mode) => setReaderMode(mode as ReaderMode))}
        {select(t("settings.theme"), config.reader.theme, [["System","System"],["Light","Light"],["Dark","Dark"]], (theme) => updateReader({ theme: theme as Config["reader"]["theme"] }))}
        {select(t("settings.textAlign"), textAlign, [["left", t("settings.alignLeft")], ["justify", t("settings.alignJustify")]], (alignment) => setTextAlign(alignment as ReaderTextAlign))}
        <SettingRange label={t("settings.paragraphSpacing")} min={0} max={2} step={0.1} value={paragraphSpacing} onChange={setParagraphSpacing} />
        <SettingText label={t("settings.font")} value={config.reader.font_family} onChange={(font_family) => updateReader({ font_family })} />
        {number(t("settings.fontSize"), config.reader.font_size, (font_size) => updateReader({ font_size }), 12, 48)}
        {number(t("settings.lineHeight"), config.reader.line_height, (line_height) => updateReader({ line_height }), 1, 4)}
        {number(t("settings.contentWidth"), config.reader.content_width, (content_width) => updateReader({ content_width }), 400, 1600)}
        {toggle(t("settings.rememberPosition"), config.reader.remember_position, (remember_position) => updateReader({ remember_position }))}
        {toggle(t("settings.restoreLastBook"), config.reader.restore_last_book, (restore_last_book) => updateReader({ restore_last_book }))}
        {toggle(t("settings.showWordTranslation"), config.reader.show_word_translation, (show_word_translation) => updateReader({ show_word_translation }))}
        {toggle(t("settings.showSentenceTranslation"), config.reader.show_sentence_translation, (show_sentence_translation) => updateReader({ show_sentence_translation }))}
        {toggle(t("settings.showPageNumbers"), config.reader.show_page_numbers, (show_page_numbers) => updateReader({ show_page_numbers }))}
        {toggle(t("settings.showProgress"), config.reader.show_progress, (show_progress) => updateReader({ show_progress }))}
        {toggle(t("settings.selectText"), config.reader.allow_text_selection, (allow_text_selection) => updateReader({ allow_text_selection }))}
      </>)}
      {card(t("settings.translate"), <>
        <SettingText label={t("settings.sourceLanguage")} inputClassName="w-24" value={config.translate.source_language} onChange={(source_language) => updateTranslate({ source_language })} />
        <SettingText label={t("settings.targetLanguage")} inputClassName="w-24" value={config.translate.target_language} onChange={(target_language) => updateTranslate({ target_language })} />
        {select(t("settings.translateMode"), config.translate.mode, [["OnlineFirst","Online → offline"],["OfflineFirst","Offline → online"],["OnlineOnly","Online only"],["OfflineOnly","Offline only"]], (mode) => updateTranslate({ mode: mode as Config["translate"]["mode"] }))}
        {toggle(t("settings.online"), config.translate.online.enabled, (enabled) => updateTranslate({ online: { ...config.translate.online, enabled } }))}
        {toggle(t("settings.cache"), config.translate.cache.enabled, (enabled) => updateTranslate({ cache: { ...config.translate.cache, enabled } }))}
        {number(t("settings.timeout"), config.translate.online.timeout_secs, (timeout_secs) => updateTranslate({ online: { ...config.translate.online, timeout_secs } }), 1, 120)}
        {number(t("settings.cacheTtl"), config.translate.cache.ttl_secs, (ttl_secs) => updateTranslate({ cache: { ...config.translate.cache, ttl_secs } }), 60, 2592000)}
      </>)}
      {card(t("settings.learning"), <>
        {toggle(t("settings.learningEnabled"), config.learning.enabled, (enabled) => updateLearning({ enabled }))}
        {toggle(t("settings.adaptive"), config.learning.adaptive_learning, (adaptive_learning) => updateLearning({ adaptive_learning }))}
        {toggle(t("settings.review"), config.learning.review.enabled, (enabled) => updateLearning({ review: { ...config.learning.review, enabled } }))}
        {toggle(t("settings.comprehension"), config.learning.exercises.comprehension, (comprehension) => updateLearning({ exercises: { ...config.learning.exercises, comprehension } }))}
        {toggle(t("settings.wordExercises"), config.learning.exercises.translation, (translation) => updateLearning({ exercises: { ...config.learning.exercises, translation } }))}
        {number(t("settings.wordsPerExercise"), config.learning.exercises.words_per_exercise, (words_per_exercise) => updateLearning({ exercises: { ...config.learning.exercises, words_per_exercise } }), 1, 50)}
        {number(t("settings.maxPerSession"), config.learning.exercises.max_per_session, (max_per_session) => updateLearning({ exercises: { ...config.learning.exercises, max_per_session } }), 1, 100)}
        {number(t("settings.initialInterval"), config.learning.review.initial_interval_days, (initial_interval_days) => updateLearning({ review: { ...config.learning.review, initial_interval_days } }), 1, 365)}
        {number(t("settings.maxInterval"), config.learning.review.max_interval_days, (max_interval_days) => updateLearning({ review: { ...config.learning.review, max_interval_days } }), 1, 3650)}
      </>)}
      {card(t("settings.download"), <>
        {toggle(t("settings.resumeDownloads"), config.download.resume_downloads, (resume_downloads) => updateDownload({ resume_downloads }))}
        {toggle(t("settings.covers"), config.download.download_covers, (download_covers) => updateDownload({ download_covers }))}
        {number(t("settings.maxBookSize"), config.download.max_book_size_mb, (max_book_size_mb) => updateDownload({ max_book_size_mb }), 1, 5000)}
        {number(t("settings.concurrentDownloads"), config.download.max_concurrent_downloads, (max_concurrent_downloads) => updateDownload({ max_concurrent_downloads }), 1, 16)}
        {number(t("settings.downloadTimeout"), config.download.request_timeout_secs, (request_timeout_secs) => updateDownload({ request_timeout_secs }), 5, 600)}
        {number(t("settings.retries"), config.download.max_retries, (max_retries) => updateDownload({ max_retries }), 0, 20)}
        <SettingText label={t("settings.booksDir")} inputClassName="max-w-[60%]" value={config.download.books_dir} onChange={(books_dir) => updateDownload({ books_dir })} />
        <SettingText label={t("settings.tempDir")} inputClassName="max-w-[60%]" value={config.download.temp_dir} onChange={(temp_dir) => updateDownload({ temp_dir })} />
      </>)}
    </div>
    <footer className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground" aria-live="polite"><span>{loading ? t("settings.saving") : t("settings.saved")}</span><Button variant="outline" onClick={async () => { const result = await commands.resetConfig(); if (result.status === "ok") await load(); }}>{t("settings.reset")}</Button></footer>
  </div>;
}
