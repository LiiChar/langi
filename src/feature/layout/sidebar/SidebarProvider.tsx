import { useCallback, useRef, useState } from "react"
import type { KeyboardEvent, PointerEvent } from "react"

import { useLayoutStore } from "../store/LayoutStore"
import { RootSidebar } from "./RootSidebar"

const ICON_SIZE = 54
const ICON_MODE_BUFFER = 36
const ICON_MODE_ENTER_THRESHOLD = ICON_SIZE + ICON_MODE_BUFFER
const ICON_MODE_EXIT_THRESHOLD = ICON_MODE_ENTER_THRESHOLD + ICON_MODE_BUFFER
const EXPAND_STEP = 24
const MAX_FULL_SIZE = 340
const DEFAULT_FULL_SIZE = 280
const MAIN_MIN_WIDTH = "30%"

type DragState = {
  pointerId: number
  startX: number
  startWidth: number
}

function getModeForWidth(
  width: number,
  currentMode: "icon" | "full" | "hide",
): "icon" | "full" {
  if (currentMode === "icon") {
    return width >= ICON_MODE_EXIT_THRESHOLD ? "full" : "icon"
  }

  return width <= ICON_MODE_ENTER_THRESHOLD ? "icon" : "full"
}

export default function RootSidebarProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const dragWidthRef = useRef<number | null>(null)
  const fullWidthRef = useRef(DEFAULT_FULL_SIZE)
  const sidebarModeRef = useRef<"icon" | "full" | "hide">("full")

  const [fullWidth, setFullWidth] = useState(DEFAULT_FULL_SIZE)
  const [dragWidth, setDragWidth] = useState<number | null>(null)

  const sidebarMode = useLayoutStore((state) => state.sidebarMode)
  const setSidebarMode = useLayoutStore((state) => state.setSidebarMode)

  sidebarModeRef.current = sidebarMode

  const sidebarVisible = sidebarMode !== "hide"
  const collapsed = sidebarMode === "icon"
  const renderedSidebarWidth = dragWidth ?? (collapsed ? ICON_SIZE : fullWidth)

  const getMaxFullWidth = useCallback(() => {
    const containerWidth = containerRef.current?.getBoundingClientRect().width
    if (!containerWidth) return MAX_FULL_SIZE

    return Math.max(
      ICON_SIZE,
      Math.min(MAX_FULL_SIZE, containerWidth * 0.7 - 4),
    )
  }, [])

  const setSavedFullWidth = useCallback((width: number) => {
    const nextWidth = Math.max(
      ICON_MODE_ENTER_THRESHOLD + 1,
      Math.min(width, MAX_FULL_SIZE),
    )
    fullWidthRef.current = nextWidth
    setFullWidth(nextWidth)
  }, [])

  const updateMode = useCallback(
    (mode: "icon" | "full") => {
      if (sidebarModeRef.current === mode) return

      sidebarModeRef.current = mode
      setSidebarMode(mode)
    },
    [setSidebarMode],
  )

  const handleResizePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || sidebarModeRef.current === "hide") return

      event.preventDefault()
      const currentWidth =
        sidebarRef.current?.getBoundingClientRect().width ?? renderedSidebarWidth

      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startWidth: currentWidth,
      }
      dragWidthRef.current = currentWidth
      setDragWidth(currentWidth)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [renderedSidebarWidth],
  )

  const handleResizePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return

      const nextWidth = Math.max(
        ICON_SIZE,
        Math.min(
          drag.startWidth + event.clientX - drag.startX,
          getMaxFullWidth(),
        ),
      )

      dragWidthRef.current = nextWidth
      setDragWidth(nextWidth)
      updateMode(getModeForWidth(nextWidth, sidebarModeRef.current))
    },
    [getMaxFullWidth, updateMode],
  )

  const finishResize = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return

      const finalWidth = dragWidthRef.current ?? drag.startWidth
      const finalMode = getModeForWidth(finalWidth, sidebarModeRef.current)
      if (finalMode === "full") {
        setSavedFullWidth(finalWidth)
      }
      updateMode(finalMode)

      dragRef.current = null
      dragWidthRef.current = null
      setDragWidth(null)
    },
    [setSavedFullWidth, updateMode],
  )

  const handleResizeKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return

      event.preventDefault()
      const direction = event.key === "ArrowRight" ? 1 : -1

      if (sidebarModeRef.current === "icon") {
        if (direction > 0) {
          const targetWidth = Math.min(
            Math.max(fullWidthRef.current, ICON_MODE_EXIT_THRESHOLD),
            getMaxFullWidth(),
          )
          setSavedFullWidth(targetWidth)
          updateMode("full")
        }
        return
      }

      const currentWidth =
        sidebarRef.current?.getBoundingClientRect().width ?? renderedSidebarWidth
      const nextWidth = Math.max(
        ICON_SIZE,
        Math.min(currentWidth + direction * EXPAND_STEP, getMaxFullWidth()),
      )

      const nextMode = getModeForWidth(nextWidth, sidebarModeRef.current)
      if (nextMode === "full") {
        setSavedFullWidth(nextWidth)
      }
      updateMode(nextMode)
    },
    [getMaxFullWidth, renderedSidebarWidth, setSavedFullWidth, updateMode],
  )

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 w-full min-w-0 overflow-hidden"
    >
      {sidebarVisible ? (
        <>
          <div
            ref={sidebarRef}
            style={{
              width: `${renderedSidebarWidth}px`,
              maxWidth: "max(54px, calc(70% - 4px))",
              minWidth: `${ICON_SIZE}px`,
            }}
            className={`h-full min-h-0 shrink-0 overflow-hidden ${
              dragWidth === null
                ? "transition-[width] duration-200 ease-in-out"
                : "transition-none"
            }`}
          >
            <RootSidebar collapsed={collapsed} />
          </div>

          <div
            role="separator"
            aria-label="Изменить ширину боковой панели"
            aria-orientation="vertical"
            aria-valuemin={ICON_SIZE}
            aria-valuemax={MAX_FULL_SIZE}
            aria-valuenow={Math.round(renderedSidebarWidth)}
            tabIndex={0}
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={finishResize}
            onPointerCancel={finishResize}
            onLostPointerCapture={finishResize}
            onKeyDown={handleResizeKeyDown}
            className="group relative z-10 -ml-1 flex w-[4px] shrink-0 cursor-col-resize touch-none select-none items-center justify-center outline-none "
          >
            <div className="h-full w-px bg-transparent transition-colors " />
          </div>
        </>
      )
        :
        <div className="h-full w-1">

        </div>
      }

      <div
        style={{ minWidth: sidebarVisible ? MAIN_MIN_WIDTH : 0 }}
        className="h-full min-h-0 min-w-0 flex-1 overflow-hidden"
      >
        {children}
      </div>
    </div>
  )
}
