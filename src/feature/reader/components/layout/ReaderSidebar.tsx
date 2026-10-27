import { BookOpenText, X } from "lucide-react";
import { Button } from "#ui/button";
import { SettingNumber, SettingRange, SettingSelect, SettingText, SettingToggle } from "#ui/setting-fields";
import { useI18n } from "@/shared/i18n";
import { useSettingsStore } from "@/shared/store/SettingsStore";
import { type Config } from "@/shared/commands/bindings";
import { updateConfigSection } from "@/shared/lib/updateConfigSection";
import { ReaderMode, ReaderSidebarSection, ReaderTextAlign, useReaderDisplayStore } from "../../store/ReaderDisplayStore";

type ReaderSidebarProps = {
  chapters: Array<{ id: string; title: string | null }>;
  mode: ReaderMode;
  activeChapterIndex: number;
  onNavigateToChapter: (chapterIndex: number) => void;
};

export function ReaderSidebar({ chapters, mode, activeChapterIndex, onNavigateToChapter }: ReaderSidebarProps) {
  const { t } = useI18n();
  const open = useReaderDisplayStore((state) => state.sidebarOpen);
  const section = useReaderDisplayStore((state) => state.sidebarSection);
  const setSection = useReaderDisplayStore((state) => state.setSidebarSection);
  const close = useReaderDisplayStore((state) => state.closeSidebar);
  const setMode = useReaderDisplayStore((state) => state.setMode);
  const textAlign = useReaderDisplayStore((state) => state.textAlign);
  const setTextAlign = useReaderDisplayStore((state) => state.setTextAlign);
  const paragraphSpacing = useReaderDisplayStore((state) => state.paragraphSpacing);
  const setParagraphSpacing = useReaderDisplayStore((state) => state.setParagraphSpacing);
  const config = useSettingsStore((state) => state.config);

  const updateReader = (patch: Partial<Config["reader"]>) => {
    updateConfigSection("reader", patch);
  };
  const select = (label: string, value: string, options: Array<[string, string]>, onChange: (value: string) => void) => <SettingSelect label={label} value={value} options={options} onChange={onChange} compact />;
  const number = (label: string, value: number, min: number, max: number, step: number, onChange: (value: number) => void) => <SettingNumber label={label} value={value} min={min} max={max} step={step} onChange={onChange} compact />;
  const toggle = (label: string, checked: boolean, onChange: (value: boolean) => void) => <SettingToggle label={label} checked={checked} onChange={onChange} compact />;
  const navItem = (id: ReaderSidebarSection, icon: React.ReactNode, label: string) => (
    <Button key={id} variant={section === id ? "secondary" : "ghost"} className=" gap-1 text-xs" aria-current={section === id ? "page" : undefined} onClick={() => setSection(id)}>
      {icon}<span className="text-center leading-tight">{label}</span>
    </Button>
  );

  if (!open) return null;

  return <>
    <button className="absolute inset-0 z-30 cursor-default lg:hidden" aria-label={t("reader.closeSidebar")} onClick={close} />
    <div className="w-1 lg:w-0 h-full"></div>
    <aside className="absolute inset-y-0 right-1 z-40 flex flex-col overflow-hidden rounded-lg border-l bg-background/90 backdrop-blur-lg lg:bg-background lg:static lg:mx-1 lg:z-auto lg:h-full lg:w-[min(30rem,38%)] lg:shrink-0 lg:rounded-xl lg:border lg:shadow-none">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
          <nav aria-label={t("reader.sidebarNavigation")} className=" gap-1 flex">
            {navItem("settings", "", t("settings.reader"))}
            {navItem("chapters", "", t("reader.chapters"))}
          </nav>
          <Button size="icon" variant="ghost" className="size-8 shrink-0" aria-label={t("reader.closeSidebar")} onClick={close}><X /></Button>
        </header>
        {section === "settings"
          ?
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <section className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">{t("settings.readerMode")}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={mode === "learning" ? "secondary" : "outline"} className="min-h-12 whitespace-normal" onClick={() => setMode("learning")}><BookOpenText />{t("reader.learningMode")}</Button>
                  <Button variant={mode === "free" ? "secondary" : "outline"} className="min-h-12 whitespace-normal" onClick={() => setMode("free")}>{t("reader.freeMode")}</Button>
                </div>
              </section>
              {
              config &&
                <section className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">{t("reader.customize")}</h3>
                  {select(t("settings.theme"), config.reader.theme, [["System", t("settings.themeSystem")], ["Light", t("settings.themeLight")], ["Dark", t("settings.themeDark")]], (theme) => updateReader({ theme: theme as Config["reader"]["theme"] }))}
                  <SettingText label={t("settings.font")} inputClassName="w-36" value={config.reader.font_family} onChange={(font_family) => updateReader({ font_family })} compact />
                  {number(t("settings.fontSize"), config.reader.font_size, 12, 48, 1, (font_size) => updateReader({ font_size }))}
                  {number(t("settings.lineHeight"), config.reader.line_height, 1, 4, 0.1, (line_height) => updateReader({ line_height }))}
                  {number(t("settings.contentWidth"), config.reader.content_width, 400, 1600, 20, (content_width) => updateReader({ content_width }))}
                  {select(t("settings.textAlign"), textAlign, [["left", t("settings.alignLeft")], ["justify", t("settings.alignJustify")]], (alignment) => setTextAlign(alignment as ReaderTextAlign))}
                  <SettingRange label={t("settings.paragraphSpacing")} min={0} max={2} step={0.1} value={paragraphSpacing} onChange={setParagraphSpacing} compact />
                  {toggle(t("settings.rememberPosition"), config.reader.remember_position, (remember_position) => updateReader({ remember_position }))}
                  {toggle(t("settings.restoreLastBook"), config.reader.restore_last_book, (restore_last_book) => updateReader({ restore_last_book }))}
                  {toggle(t("settings.showWordTranslation"), config.reader.show_word_translation, (show_word_translation) => updateReader({ show_word_translation }))}
                  {toggle(t("settings.showSentenceTranslation"), config.reader.show_sentence_translation, (show_sentence_translation) => updateReader({ show_sentence_translation }))}
                  {toggle(t("settings.showPageNumbers"), config.reader.show_page_numbers, (show_page_numbers) => updateReader({ show_page_numbers }))}
                  {toggle(t("settings.showProgress"), config.reader.show_progress, (show_progress) => updateReader({ show_progress }))}
                  {toggle(t("settings.selectText"), config.reader.allow_text_selection, (allow_text_selection) => updateReader({ allow_text_selection }))}
                </section>
              }
            </div>
          :
          <nav aria-label={t("reader.chapters")} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {
              chapters.map((chapter, chapterIndex) => (
                <button key={chapter.id}
                  disabled={mode === "learning" && chapterIndex > activeChapterIndex}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => { onNavigateToChapter(chapterIndex); close(); }}
                >
                  <span className="mr-2 text-muted-foreground tabular-nums">
                    {chapterIndex + 1}
                  </span>
                  {chapter.title || `${t("reader.chapter")} ${chapterIndex + 1}`}
                </button>)
              )
            }
          </nav>
        }
      </section>
    </aside>
  </>;
}
