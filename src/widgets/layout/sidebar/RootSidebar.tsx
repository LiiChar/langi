import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "#ui/sidebar"
import * as React from "react"
import { SidebarUser } from "./SidebarUser"
import { AudioLines, Book, ChartArea, Goal, Leaf, Library, Mail, Settings } from "lucide-react"
import { User } from "@/entities/user/user.type"
import { Button } from "#ui/button"

type Item = {
  title: string;
  icon: React.ReactNode;
}

const links: Item[] = [
  {
    icon: <Book />,
    title: "Reading"
  },
  {
    icon: <Library />,
    title: "Library"
  },
  {
    icon: <AudioLines />,
    title: "Vocabulary"
  },
  {
    icon: <Mail />,
    title: "Review"
  },
  {
    icon: <ChartArea />,
    title: "Statistics"
  },
  {
    icon: <Goal />,
    title: "Gols"
  },
  {
    icon: <Settings />,
    title: "Settings"
  },

];

export function RootSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  let user: User = {
    id: "1",
    name: "shadcn",
    email: "m@example.com",
    avatar: "https://ui.shadcn.com/avatars/shadcn.jpg",
  }
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Button variant={"ghost"} className={"justify-start text-start"}>
          <Leaf className="size-5!" />
          <span className="text-base font-semibold">Langi</span>
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {links.map((l) => (
                <SidebarItem key={l.title} item={l} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}


export type SidebarItemType = {
  item: Item
}

export const SidebarItem = ({ item }: SidebarItemType) => {
  return (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton tooltip={item.title}>
        { item.icon }
        <span>{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
