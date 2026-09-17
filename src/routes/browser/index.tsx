import { BrowserPage } from '@/feature/library/pages/Browser'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/browser/')({
  component: BrowserPage,
})
