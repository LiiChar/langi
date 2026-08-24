import { BookPage } from '@/feature/book/pages/BookPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/library/$bookId')({
  component: BookPage,
})
