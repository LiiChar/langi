import { Header } from "./header/Header";
import RootProviders from "./Providers";
import { useLayoutStore } from "./store/LayoutStore";
import { cn } from "#lib/utils";
import { Footer } from "./footer/Footer";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const header = useLayoutStore((state) => state.header);
  const headerVisible = useLayoutStore((state) => state.headerVisible);
  const footer = useLayoutStore((state) => state.footer);
  const footerVisible = useLayoutStore((state) => state.footerVisible);
  const rightSidebar = useLayoutStore((state) => state.rightSidebar);
  const rightSidebarVisible = useLayoutStore((state) => state.rightSidebarVisible);

  return (
      <div className="relative flex h-[calc(100vh-48px)] min-h-screen w-full min-w-0 flex-col overflow-hidden bg-sidebar">
        {headerVisible ? (header ?? <Header />) : <div className="h-1 w-full shrink-0"></div>}

        <RootProviders>
            <div className="relative flex min-h-0 min-w-0 flex-1 h-full">
              <main className={cn("min-h-0 min-w-0 flex-1 bg-background overflow-y-auto border border-transparent rounded-lg")}>
                {children}
              </main>
              {rightSidebarVisible ? rightSidebar : <div className="h-full w-1"></div>}
            </div>
        </RootProviders>

              {footerVisible ? (footer ?? <Footer />) : <div className="h-1 w-full"></div>}
      </div>
  );
};
