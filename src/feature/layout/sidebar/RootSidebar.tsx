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
import { AudioLines, Book, ChartArea, Goal, Leaf, Library, Mail, Settings } from "lucide-react"

import { User } from "@/entities/user/user.type"
import { useLayoutStore } from "../store/LayoutStore"
import { SidebarUser } from "./SidebarUser"
import { Link } from "@tanstack/react-router"

type Item = {
  title: string,
  link: string,
  icon: React.ReactNode
}

export const links: Item[] = [
  {
    icon: <Book />,
    title: "Reading",
    link: "/reading",
  },
  {
    icon: <Library />,
    title: "Library",
    link: "/",
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

  const user: User = {
    id: "1",
    name: "shadcn",
    email: "m@example.com",
    avatar: "https://ui.shadcn.com/avatars/shadcn.jpg",
  }

  return (
    <Sidebar
      {...props}
      collapsible={collapsible}
      className="border-none"
    >
      <SidebarHeader>
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

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {links.map((item) => (
                <SidebarItem
                  key={item.title}
                  item={item}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="group-data-[collapsible=icon]:translate-x-1.5">
        <SidebarUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

export type SidebarItemType = {
  item: Item
}

export function SidebarItem({
  item,
}: SidebarItemType) {
  return (
    <Link to={item.link}>
      <SidebarMenuItem className="group-data-[collapsible=icon]:h-[40px]">
        <SidebarMenuButton tooltip={item.title} className="group-data-[collapsible=icon]:min-w-[40px] group-data-[collapsible=icon]:min-h-[40px] " >
          <div className="group-data-[collapsible=icon]:translate-x-1 group-data-[collapsible=icon]:scale-125">

          {item.icon}
          </div>
          <span>{item.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </Link>
  )
}
