import { LibraryPage } from '@/feature/library/pages/Library'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: LibraryPage,
})
