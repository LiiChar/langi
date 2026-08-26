import { SidebarInset, SidebarProvider } from "#ui/sidebar";
import { useLayoutStore } from "../store/LayoutStore";
import { MobileNavigation } from "./MobileNavigation";
import { RootSidebar } from "./RootSidebar";

export default function RootSidebarProvider({ children }: { children: React.ReactNode }) {
  const sidebarVisible = useLayoutStore(
    (state) => state.sidebarVisible
  )

  const setSidebarVisible = useLayoutStore(
    (state) => state.setSidebarVisible
  )

  return (
    <SidebarProvider open={sidebarVisible} onOpenChange={setSidebarVisible}>
      <RootSidebar />

      <SidebarInset>
          {children}
      </SidebarInset>

      <MobileNavigation />
    </SidebarProvider>
  )
}
