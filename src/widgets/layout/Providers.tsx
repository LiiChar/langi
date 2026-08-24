import { TooltipProvider } from "#ui/tooltip";
import RootSidebarProvider from "./sidebar/SidebarProvider";

export default function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <RootSidebarProvider>
        {children}
      </RootSidebarProvider>
    </TooltipProvider>
  )
}
