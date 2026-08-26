"use client"

import {
  AudioLines,
  Book,
  ChartArea,
  Goal,
  Leaf,
  Library,
  Mail,
  Settings,
} from "lucide-react"

import {
  SidebarMenuButton,
  useSidebar,
} from "#ui/sidebar"

import { links } from "./RootSidebar"

export function MobileNavigation() {
  const { openMobile, setOpenMobile } = useSidebar()

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur md:hidden">
      <nav className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {links.slice(0, 5).map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => {
              setOpenMobile(false)
            }}
            className="
              flex
              min-w-14
              flex-col
              items-center
              justify-center
              gap-1
              rounded-lg
              px-2
              py-1.5
              text-muted-foreground
              transition-colors
              hover:bg-accent
              hover:text-foreground
            "
          >
            {item.icon}

            <span className="text-[10px]">
              {item.title}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}
