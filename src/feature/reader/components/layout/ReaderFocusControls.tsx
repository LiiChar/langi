import { Button } from "#ui/button";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, PanelLeft, PanelLeftDashedIcon, Settings2 } from "lucide-react";
import type { HTMLAttributes, Ref } from "react";
import { useI18n } from "@/shared/i18n";
import { useReaderDisplayStore } from "../../store/ReaderDisplayStore";
import { HeaderDecoration } from "@/feature/layout/header/HeaderDecoration";
import { useLayoutStore } from "@/feature/layout/store/LayoutStore";

const floatingButtonClass = " bg-background/90 shadow-lg backdrop-blur hover:bg-accent";

export function ReaderFocusControls({
  visible,
  ref,
  onPointerEnter,
  onPointerLeave,
}: {
  visible: boolean;
  ref?: Ref<HTMLDivElement>;
} & HTMLAttributes<HTMLDivElement>) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const openReaderSidebar = useReaderDisplayStore((state) => state.openSidebar);
  const setSidebarMode = useLayoutStore((state) => state.setSidebarMode)
  const sidebarMode = useLayoutStore((state) => state.sidebarMode)


  return <>
    <div
      ref={ref}
      className={`pointer-events-none absolute  top-3 z-50 flex items-start justify-between transition-all duration-200 ${visible ? "translate-y-0 opacity-100" : "-translate-y-16 opacity-0"} ${sidebarMode == 'icon' ? "inset-x-16" : "inset-x-3"}`}
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
    >
      <div className="pointer-events-auto flex gap-2">
        <Button className={floatingButtonClass} size="icon" variant="outline" aria-label={t("nav.library")} title={t("nav.library")} onClick={() => void navigate({ to: "/" })}>
          <ArrowLeft />
        </Button>
        <Button className={floatingButtonClass} size="icon" variant="outline" aria-label={t("reader.settings")} title={t("reader.settings")} onClick={() => openReaderSidebar("settings")}>
          <Settings2 />
        </Button>
        <Button className={floatingButtonClass} size="icon" variant="outline" aria-label={t("reader.settings")} title={t("reader.settings")} onClick={() => setSidebarMode(sidebarMode == 'icon' ? "hide" : "icon")}>
          {sidebarMode == 'icon' ?
            <PanelLeftDashedIcon />
            :
            <PanelLeft />}
        </Button>
      </div>
    </div>
  </>;
}
