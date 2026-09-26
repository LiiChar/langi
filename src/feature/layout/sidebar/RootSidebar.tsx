import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "#ui/sidebar"

import * as React from "react"
import { AudioLines, Book, ChartArea, Earth, Goal, Leaf, Library, Mail, Settings } from "lucide-react"

import { User } from "@/entities/user/user.type"
import { useLayoutStore } from "../store/LayoutStore"
import { SidebarUser } from "./SidebarUser"
import { Link, useLocation, useRouter } from "@tanstack/react-router"
import { cn } from "cn"
import { useReaderStore } from "@/feature/reader/store/ReaderStore"
import { SidebarBook } from "./SidebarBook"

type Item = {
  title: string,
  link: string,
  icon: React.ReactNode
}

export const links: Item[] = [

  {
    icon: <Library />,
    title: "Library",
    link: "/",
  },
  {
    icon: <Earth />,
    title: "Browser",
    link: "/browser",
  },
  {
    icon: <AudioLines />,
    title: "Vocabulary",
    link: "/vocabulary",
  },
  {
    icon: <Mail />,
    title: "Review",
    link: "/review",
  },
  {
    icon: <ChartArea />,
    title: "Statistics",
    link: "/statistics",
  },
  {
    icon: <Goal />,
    title: "Goals",
    link: "/goals",
  },
  {
    icon: <Settings />,
    title: "Settings",
    link: "/settings",
  },
]

export function RootSidebar(
  props: React.ComponentProps<typeof Sidebar>
) {

  const isOpen = useLayoutStore(
    (state) => state.sidebarVisible
  )

  const setOpen = useLayoutStore(
    (state) => state.setSidebarVisible
  )

  const collapsible = useLayoutStore(
    (state) => state.sidebarMode
  )

  const { pathname } = useLocation();

  let book = useReaderStore((store) => store.book);

  return (
    <Sidebar
      {...props}
      collapsible={collapsible}
      className="border-none "
    >
      <SidebarHeader className="bg-secondary!">
        <SidebarMenuButton
          className="
            justify-start
            text-start
            transition-opacity
            group-data-[collapsible=icon]:translate-x-1
            group-data-[collapsible=icon]:scale-125
            group-data-[collapsible=icon]:translate-y-1
            group
          "
          onClick={() => setOpen(!isOpen)}
        >
          <Leaf className="" />

          <span className="text-base font-semibold group-data-[collapsible=icon]:hidden">
            Langi
          </span>
        </SidebarMenuButton>
      </SidebarHeader>

      <SidebarContent className="bg-secondary!">
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {links.map((item) => (
                <SidebarItem
                  key={item.title}
                  item={item}
                  active={pathname === item.link}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className=" bg-secondary!">
        {book && <SidebarBook book={book} />}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

export type SidebarItemType = {
  item: Item,
  active: boolean,
}

export function SidebarItem({
  item,
  active,
}: SidebarItemType) {
  return (
    <Link to={item.link} className="block min-w-0">
      <SidebarMenuItem className="min-w-0 group-data-[collapsible=icon]:h-[40px]">
        <SidebarMenuButton
          tooltip={item.title}
          className={cn(
            "min-w-0",
            "group-data-[collapsible=icon]:min-w-[40px]",
            "group-data-[collapsible=icon]:min-h-[40px]",
            {
              "bg-background! hover:bg-secondary/30": active,
            }
          )}
        >
          <div className="shrink-0 group-data-[collapsible=icon]:translate-x-1 group-data-[collapsible=icon]:scale-125">
            {item.icon}
          </div>

          <span className="min-w-0 truncate group-data-[collapsible=icon]:hidden">
            {item.title}
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </Link>
  );
}
