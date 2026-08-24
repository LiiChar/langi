import { Header } from "./header/Header"
import { Footer } from "./Footer"
import RootProviders from "./Providers"

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <RootProviders>
        <div className="w-full h-full">
          <Header />

          <main className="w-full h-full">
            {children}
          </main>

          <Footer />
        </div>
    </RootProviders>
  )
}
