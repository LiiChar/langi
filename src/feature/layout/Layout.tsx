import { Header } from "./header/Header"
import { Footer } from "./Footer"
import RootProviders from "./Providers"
import { useLayoutStore } from "./store/LayoutStore"

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { header, footer, footerVisible, headerVisible } = useLayoutStore()

  return (
    <RootProviders>
      <div className="flex h-screen min-h-0 w-full flex-col overflow-hidden bg-sidebar">
        {headerVisible && (header ?? <Header />)}

        <div className="flex min-h-0 flex-1 w-full pr-1">
          <div className="flex min-h-0 h-full w-full flex-col ">
            <div className="min-h-0 flex-1 overflow-y-auto">
              {children}
            </div>
          </div>
        </div>

        {footerVisible && (footer ?? <Footer />)}
      </div>
    </RootProviders>
  )
}
