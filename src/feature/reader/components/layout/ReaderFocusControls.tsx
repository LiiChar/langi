import { Button } from "#ui/button";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, PanelLeft, PanelLeftDashedIcon, Settings2 } from "lucide-react";
import type { Ref } from "react";
import { useI18n } from "@/shared/i18n";
import { useReaderDisplayStore } from "../../store/ReaderDisplayStore";
import { useLayoutStore } from "@/feature/layout/store/LayoutStore";

const floatingButtonClass = " bg-background/90 shadow-lg backdrop-blur hover:bg-accent";

export function ReaderFocusControls({
  visible,
  ref,
}: {
  visible: boolean;
  ref?: Ref<HTMLDivElement>;
}) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const setSidebarSection = useReaderDisplayStore((state) => state.setSidebarSection);
  const showRightSidebar = useLayoutStore((state) => state.showRightSidebar);
  const setSidebarMode = useLayoutStore((state) => state.setSidebarMode)
  const sidebarMode = useLayoutStore((state) => state.sidebarMode)
  const sidebarToggleLabel = sidebarMode === "icon"
    ? t("reader.hideAppSidebar")
    : t("reader.showAppSidebar");
  const openReaderSettings = () => {
    setSidebarSection("settings");
    showRightSidebar();
  };


  return <>
    <div
      ref={ref}
      className={`pointer-events-none absolute top-3 z-50 flex items-start justify-between transition-all duration-200 ${visible ? "translate-y-0 opacity-100" : "-translate-y-16 opacity-0"} ${sidebarMode == 'icon' ? "inset-x-16" : "inset-x-3"}`}
    >
      <div className={`flex gap-2 ${visible ? "pointer-events-auto" : "pointer-events-none"}`}>
        <Button className={floatingButtonClass} size="icon" variant="outline" aria-label={t("nav.library")} title={t("nav.library")} onClick={() => void navigate({ to: "/" })}>
          <ArrowLeft />
        </Button>
        <Button className={floatingButtonClass} size="icon" variant="outline" aria-label={t("reader.settings")} title={t("reader.settings")} onClick={openReaderSettings}>
          <Settings2 />
        </Button>
        <Button className={floatingButtonClass} size="icon" variant="outline" aria-label={sidebarToggleLabel} title={sidebarToggleLabel} onClick={() => setSidebarMode(sidebarMode == 'icon' ? "hide" : "icon")}>
          {sidebarMode == 'icon' ?
            <PanelLeftDashedIcon />
            :
            <PanelLeft />}
        </Button>
      </div>
    </div>
  </>;
}
