import {
  AudioLines,
  ChartArea,
  Earth,
  Goal,
  Library,
  Mail,
  Settings,
  Languages,
} from "lucide-react"

import { Link, useLocation } from "@tanstack/react-router"
import { buttonVariants } from "#ui/button"
import { cn } from "cn"
import { useReaderStore } from "@/feature/reader/store/ReaderStore"
import { SidebarBook } from "./SidebarBook"
import { useI18n } from "@/shared/i18n"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "#ui/tooltip"

type Item = {
  title: string
  link: string
  icon: React.ReactNode
}

export const links: Item[] = [
  { icon: <Library />, title: "nav.library", link: "/" },
  { icon: <Earth />, title: "nav.browser", link: "/browser" },
  { icon: <Languages />, title: "nav.dictionaries", link: "/dictionaries" },
  { icon: <AudioLines />, title: "nav.vocabulary", link: "/vocabulary" },
  { icon: <Mail />, title: "nav.review", link: "/review" },
  { icon: <ChartArea />, title: "nav.statistics", link: "/statistics" },
  { icon: <Goal />, title: "nav.goals", link: "/goals" },
  { icon: <Settings />, title: "nav.settings", link: "/settings" },
]

type RootSidebarProps = {
  collapsed: boolean;
}

export function RootSidebar({ collapsed }: RootSidebarProps) {
  const { pathname } = useLocation()
  const book = useReaderStore((state) => state.book)


  return (
    <TooltipProvider>
      <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-none bg-sidebar text-sidebar-foreground">
        <nav className="min-h-0 flex-1 overflow-y-auto p-2">
          <div className="flex flex-col gap-1">
            {links.map((item) => (
              <SidebarItem
                key={item.link}
                item={item}
                active={pathname === item.link}
                collapsed={collapsed}
              />
            ))}
          </div>
        </nav>

        {/* Footer */}
        {book && (
          <div className="shrink-0 overflow-hidden p-1">
            <SidebarBook book={book} />
          </div>
        )}
      </aside>
    </TooltipProvider>
  )
}

export type SidebarItemType = {
  item: Item
  active: boolean
  collapsed?: boolean
}

export function SidebarItem({
  item,
  active,
  collapsed = false,
}: SidebarItemType) {
  const { t } = useI18n()

  const link = (
    <Link
      to={item.link}
      aria-label={collapsed ? t(item.title) : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        buttonVariants({ variant: "ghost", size: collapsed ? "icon" : "default" }),
        "w-full min-w-0 gap-2 p-1",
        collapsed ? "size-10 justify-center" : "justify-start",
        active && "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80",
      )}
    >
      <span className="shrink-0">{item.icon}</span>

      {!collapsed && (
        <span className="min-w-0 truncate">{t(item.title)}</span>
      )}
    </Link>
  )

  if (!collapsed) {
    return link
  }

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">
        {t(item.title)}
      </TooltipContent>
    </Tooltip>
  )
}
