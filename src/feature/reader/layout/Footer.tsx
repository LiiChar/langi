
type ReaderFooterProps = {
  onNext?: () => void
}

export const ReaderFooter = ({onNext}: ReaderFooterProps) => {
  return (
    <footer className="rounded-lg border border-border bg-background flex justify-center items-center mt-1 mb-1 mr-1 p-1">
      <div onClick={onNext}>
        Продолжить
      </div>
    </footer>
  )
}
