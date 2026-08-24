import { SidebarProvider } from "#ui/sidebar";
import { RootSidebar } from "./RootSidebar";

export default function RootSidebarProvider({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <RootSidebar />
      {children}
    </SidebarProvider>
  )
}
