import { Avatar, AvatarFallback, AvatarImage } from "#ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#ui/dropdown-menu"
import { Button } from "#ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "#ui/tooltip"

import type { User } from "@/entities/user/user.type"

import {
  Bell,
  CreditCard,
  EllipsisVertical,
  LogOut,
  User as UserIcon,
} from "lucide-react"

import { useLayoutStore } from "../store/LayoutStore"

export type SidebarUserProps = {
  user: User
}

export function SidebarUser({ user }: SidebarUserProps) {
  const sidebarMode = useLayoutStore((state) => state.sidebarMode)
  const collapsed = sidebarMode === "icon"
  const initials = user.name.slice(0, 2).toUpperCase()

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size={collapsed ? "icon" : "lg"}
                    className={[
                      "w-full min-w-0",
                      "justify-start gap-2",
                      "overflow-hidden",
                      collapsed ? "size-10 justify-center" : "px-1.5",
                    ].join(" ")}
                  />
                }
              />
            }
          >
            <Avatar className="size-8 shrink-0 rounded-lg grayscale">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-lg">
                {initials}
              </AvatarFallback>
            </Avatar>

            {!collapsed && (
              <>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>

                <EllipsisVertical className="ml-auto size-4 shrink-0" />
              </>
            )}
          </TooltipTrigger>

          {collapsed && (
            <TooltipContent side="right">
              {user.name}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent
        className="min-w-56 rounded-lg"
        side={collapsed ? "right" : "bottom"}
        align={collapsed ? "start" : "end"}
        sideOffset={4}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="size-8 shrink-0 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {user.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuItem>
            <UserIcon />
            Account
          </DropdownMenuItem>

          <DropdownMenuItem>
            <CreditCard />
            Billing
          </DropdownMenuItem>

          <DropdownMenuItem>
            <Bell />
            Notifications
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
