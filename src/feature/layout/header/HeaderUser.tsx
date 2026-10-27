import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "#ui/dropdown-menu";
import { Button } from "#ui/button";
import { Languages, Settings, BookOpen } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useSettingsStore } from "@/shared/store/SettingsStore";
import { useI18n } from "@/shared/i18n";

export function HeaderUser() {
  const { config, save } = useSettingsStore();
  const { t, language } = useI18n();
  return <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={t("header.language")}><Languages className="size-4" /></Button>} />
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => { if (config) void save({ ...config, general: { ...config.general, language: language === "ru" ? "en" : "ru" } }); }}><Languages />{language === "ru" ? "English" : "Русский"}</DropdownMenuItem>
      <DropdownMenuItem render={<Link to="/settings"><Settings />{t("header.settings")}</Link>} />
      <DropdownMenuItem render={<Link to="/dictionaries"><BookOpen />{t("header.dictionaries")}</Link>} />
    </DropdownMenuContent>
  </DropdownMenu>;
}
