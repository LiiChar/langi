import { Input } from "#ui/input";
import { Search } from "lucide-react";
import { useDiscoverStore } from "@/feature/library/store/DiscoverStore";
import { useI18n } from "@/shared/i18n";

export function DiscoverHeader() {
  const providers = useDiscoverStore((state) => state.providers);
  const provider = useDiscoverStore((state) => state.provider);
  const setProvider = useDiscoverStore((state) => state.setProvider);
  const query = useDiscoverStore((state) => state.query);
  const setQuery = useDiscoverStore((state) => state.setQuery);
  const { t } = useI18n();

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2" onClick={(event) => event.stopPropagation()}>
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label={t("browser.search")}
          className="h-9 pl-9"
          placeholder={t("browser.search")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <select
        aria-label={t("browser.title")}
        className="h-9 max-w-40 shrink-0 rounded-md border border-input bg-background px-2 text-sm sm:max-w-52"
        value={provider}
        onChange={(event) => setProvider(event.target.value)}
        disabled={!providers.length}
      >
        {providers.length ? providers.map((name) => <option key={name} value={name}>{name}</option>) : <option value="">{t("common.loading")}</option>}
      </select>
    </div>
  );
}
