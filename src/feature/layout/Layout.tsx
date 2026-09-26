import { Header } from "./header/Header";
import { Footer } from "./Footer";
import RootProviders from "./Providers";
import { useLayoutStore } from "./store/LayoutStore";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const {
    header,
    footer,
    footerVisible,
    headerVisible,
  } = useLayoutStore();

  return (
    <RootProviders>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-secondary">
        {headerVisible && (header ?? <Header />)}

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto pr-1">
          {children}
        </main>

        {footerVisible && (footer ?? <Footer />)}
      </div>
    </RootProviders>
  );
};
