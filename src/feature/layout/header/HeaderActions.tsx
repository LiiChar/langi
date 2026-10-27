import { Button } from "#ui/button";
import { ButtonGroup } from "#ui/button-group";
import { open } from "@tauri-apps/plugin-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "#ui/dropdown-menu";
import { FilePlusCorner, FolderPlus, MoreHorizontalIcon, LayoutGrid, LayoutList, CaseSensitive, RefreshCw, Settings2, ArrowLeft } from "lucide-react";
import { toast } from "#ui/toast";
import { commands } from "@/shared/commands/bindings";
import { useBooksStore } from "@/feature/book/store/BookStore";
import { useLibraryStore, type LibraryVariant } from "@/feature/library/store/LibraryStore";
import { convertBook } from "@/shared/commands/import";
import { useI18n } from "@/shared/i18n";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useReaderDisplayStore } from "@/feature/reader/store/ReaderDisplayStore";

export const HeaderActions = () => {
  const { pathname } = useLocation();
  const setBooks = useBooksStore((s) => s.setBooks);
  const variant = useLibraryStore((s) => s.variant);
  const setVariant = useLibraryStore((s) => s.setVariant);
  const caseSensitive = useLibraryStore((s) => s.caseSensitive);
  const setCaseSensitive = useLibraryStore((s) => s.setCaseSensitive);
  const setSortMode = useLibraryStore((s) => s.setSortMode);
  const openReaderSidebar = useReaderDisplayStore((state) => state.openSidebar);
  const { t } = useI18n();
  const navigate = useNavigate();
  const isReaderPage = /^\/book\/[^/]+\/read\/?$/.test(pathname);
  const isLibraryPage = pathname === "/";
  async function importFile(directory: boolean) {
    try {
      const path = await open({ directory, multiple: false, filters: directory ? undefined : [{ name: "Books", extensions: ["txt", "epub", "fb2", "zip", "html", "htm", "md", "markdown", "docx", "pdf", "cbz", "mobi", "rtf"] }] });
      if (!path || Array.isArray(path)) return;
      if (directory) {
        const result = await commands.commandParseBooks(path);
        if (result.status === "error") throw new Error(String(result.error));
      } else {
        const result = await commands.commandParseBook(path);
        if (result.status === "error") throw new Error(String(result.error));
      }
      const loaded = await commands.getBooks();
      if (loaded.status === "ok") setBooks(loaded.data.map(convertBook));
      toast.add({ title: directory ? t("header.importFolder") : t("header.importFile"), description: t("library.title") });
    } catch (error) { toast.add({ title: t("common.error"), description: String(error) }); }
  }
  async function refresh() {
    const result = await commands.getBooks();
    if (result.status === "ok") setBooks(result.data.map(convertBook));
    else toast.add({ title: t("common.error"), description: String(result.error) });
  }
  if (isReaderPage) return <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
    <Button size="sm" variant="outline" aria-label={t("nav.library")} title={t("nav.library")} onClick={() => void navigate({ to: "/" })}><ArrowLeft />{t("nav.library")}</Button>
    <Button size="sm" variant="outline" aria-label={t("reader.settings")} title={t("reader.settings")} onClick={() => openReaderSidebar("settings")}><Settings2 /></Button>
  </div>;

  if (!isLibraryPage) return null;

  return <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
    <ButtonGroup>
      <Button size="sm" variant={caseSensitive ? "default" : "outline"} aria-label="Case sensitive search" title="Case sensitive search" onClick={() => setCaseSensitive(!caseSensitive)}><CaseSensitive /></Button>
      <Button size="sm" variant="outline" aria-label={t("header.toggleView")} title={t("header.toggleView")} onClick={() => setVariant((variant === "list" ? "grid" : "list") as LibraryVariant)}>{variant === "list" ? <LayoutList /> : <LayoutGrid />}</Button>
      <DropdownMenu><DropdownMenuTrigger render={<Button size="sm" variant="outline" aria-label={t("header.more")}><MoreHorizontalIcon /></Button>} />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setSortMode("title")}>{t("header.sortTitle")}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSortMode("recent")}>{t("header.sortRecent")}</DropdownMenuItem>
          <DropdownMenuItem onClick={refresh}><RefreshCw />{t("header.refresh")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
    <ButtonGroup>
      <Button size="sm" variant="outline" title={t("header.importFile")} aria-label={t("header.importFile")} onClick={() => void importFile(false)}><FilePlusCorner /></Button>
      <Button size="sm" variant="outline" title={t("header.importFolder")} aria-label={t("header.importFolder")} onClick={() => void importFile(true)}><FolderPlus /></Button>
    </ButtonGroup>
  </div>;
};
