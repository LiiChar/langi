import { ReaderPage } from '@/feature/reader/page/ReaderPage'
import { commands } from '@/shared/commands/bindings'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/book/$bookId/read/')({
  component: ReaderPage,
  loader: ({ params: { bookId } }, ) => commands.getBook(bookId),
})
