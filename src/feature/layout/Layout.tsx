import { Header } from "./header/Header"
import { Footer } from "./Footer"
import RootProviders from "./Providers"
import { useLayoutStore } from "./store/LayoutStore"

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const layoutStore = useLayoutStore();
  const { header, footer, footerVisible, headerVisible } = layoutStore;

  return (
    <RootProviders>
        <div className="w-full h-[calc(100lvh-46px)]">
          {header && headerVisible ? header : <Header />}

          <main className="w-full h-full bg-sidebar pr-1 ">
            <div className="h-full w-full rounded-lg border border-border bg-background overflow-auto">
              {children}
            </div>
          </main>

          {footer && footerVisible ? footer : <Footer />}
        </div>
    </RootProviders>
  )
}
