import { Toaster } from "#ui/toast";
import { TooltipProvider } from "#ui/tooltip";
import RootSidebarProvider from "./sidebar/SidebarProvider";
import { useEffect } from "react";
import { useSettingsStore } from "@/shared/store/SettingsStore";

export default function RootProviders({ children }: { children: React.ReactNode }) {
  const loadSettings = useSettingsStore((state) => state.load);
  useEffect(() => { void loadSettings(); }, [loadSettings]);
  return (
    <TooltipProvider>
      <Toaster />
      <RootSidebarProvider>
        {children}
      </RootSidebarProvider>
    </TooltipProvider>
  )
}
