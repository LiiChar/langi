import { useCallback, useEffect, useState } from "react"

import { toast } from "#ui/toast"
import { Dialog, DialogContent } from "#ui/dialog"

export type ReaderFrameProps = {
  contentSelector: string
}

export function ReaderIframe({ contentSelector }: ReaderFrameProps) {
  const [frame, setFrame] = useState<string | null>(null)

  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target

    if (!(target instanceof Element)) return

    const link = target.closest("a")
    if (!link) return

    const href = link.getAttribute("href")
    if (!href) return

    // Внутренние якоря оставляем книге
    if (href.startsWith("#")) return

    // Блокируем опасные протоколы
    if (/^(javascript|data|file):/i.test(href.trim())) {
      e.preventDefault()
      e.stopPropagation()
      toast.add({ title: "Невозможно открыть ссылку", type: "error" })
      return
    }

    let url: URL

    try {
      url = new URL(href, document.baseURI)
    } catch {
      e.preventDefault()
      e.stopPropagation()
      toast.add({ title: "Некорректная ссылка", type: "error" })
      return
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      e.preventDefault()
      e.stopPropagation()
      toast.add({ title: "Невозможно открыть ссылку", type: "error" })
      return
    }

    e.preventDefault()
    e.stopPropagation()

    setFrame(url.href)
  }, [])

  useEffect(() => {
    const container = document.querySelector(contentSelector) as HTMLDivElement | null;

    if (!container) {
      console.warn(`ReaderIframe: контейнер "${contentSelector}" не найден`)
      return
    }

    container.addEventListener("click", handleClick)

    return () => {
      container.removeEventListener("click", handleClick)
    }
  }, [contentSelector, handleClick])

  return (
    <Dialog
      open={frame !== null}
      onOpenChange={(open) => {
        if (!open) setFrame(null)
      }}
    >
      <DialogContent className="h-[80vh] w-[90vw] overflow-hidden p-0 sm:max-w-none">
        {frame !== null && (
          <iframe
            src={frame}
            title="Внешняя ссылка"
            className="h-full w-full border-0"
            loading="eager"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
