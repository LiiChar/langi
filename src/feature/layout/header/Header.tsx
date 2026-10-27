import { HeaderActions } from "./HeaderActions";
import { HeaderDecoration } from "./HeaderDecoration";
import { DiscoverHeader } from "./DiscoverHeader";
import { HeaderSearch } from "./HeaderSearch";
import { useLocation } from "@tanstack/react-router";
import { cn } from "cn";
import { Button } from "#ui/button";
import { useLayoutStore } from "../store/LayoutStore";
import { Leaf } from "lucide-react";

export const Header = () => {
  const { pathname } = useLocation();
  const isDiscoverPage = pathname === "/browser";
  const isLibraryPage = pathname === "/";
  const sidebarMode = useLayoutStore((state) => state.sidebarMode);
  const setSidebarMode = useLayoutStore((state) => state.setSidebarMode);

  const toggleMode = () => {
    setSidebarMode(sidebarMode == 'icon' ? "full" : "icon")
  }

  return (
    <header className="bg-sidebar p-1 pb-0 relative pb-1 h-[48px] min-h-[48px] max-h-[48px]" >
      <div data-tauri-drag-region className="absolute top-0 left-0 z-1 h-full w-full">

      </div>
      <div className="flex flex-nowrap items-center justify-between gap-2 relative z-2">
        <Button variant={"ghost"} onClick={toggleMode} className={cn(
          "h-10 gap-2 shrink-0",
          sidebarMode == 'icon' ? "justify-center" : "justify-start",
        )} >
              <Leaf className="size-5 shrink-0" />

              {!(sidebarMode == 'icon') && (
                <span className="truncate text-base font-semibold">
                  Langi
                </span>
              )}
        </Button>
        <div className="flex shrink-0 gap-2">
          <HeaderActions />
        </div>
        {
          (isDiscoverPage || isLibraryPage)
          &&
          <div className="basis-full min-w-0 ">
            {isDiscoverPage
              ? <DiscoverHeader />
              : <HeaderSearch />
            }
          </div>
        }
        <div className="ml-auto flex shrink-0 gap-2">
          <HeaderDecoration />
        </div>
      </div>
    </header>
  )
}
