import { Layout } from '@/feature/layout/Layout'
import { Outlet, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Layout>
        <Outlet />
      </Layout>
    </div>
  )
}
