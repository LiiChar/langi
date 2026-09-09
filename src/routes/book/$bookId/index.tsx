import { BookPage } from '@/feature/book/pages/BookPage'
import { commands } from '@/shared/commands/bindings'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/book/$bookId/')({
  component: BookPage,
  loader: ({ params: { bookId } }, ) => commands.getBook(bookId),
})
