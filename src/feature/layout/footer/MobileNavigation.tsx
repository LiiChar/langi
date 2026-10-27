"use client"

import { links } from "../sidebar/RootSidebar"
import { useNavigate } from "@tanstack/react-router"
import { Button } from "#ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "#ui/tooltip"

export function MobileNavigation() {
  const navigate = useNavigate()

  return (
    <div className="p-1 pt-0">
        <nav className=" flex items-center justify-around border bg-background rounded-lg backdrop-blur md:hidden h-12 overflow-hidden">
        {links.slice(0, 5).map((item) => (
          <Tooltip>
            <TooltipTrigger render={
              <Button
                key={item.title}
                onClick={() => {
                  navigate({ to: item.link as any })
                }}
                variant={"ghost"}
                className="
                h-full w-[calc(100%/5)] rounded-none
                "
              >
                {item.icon}
              </Button>
            }>

            </TooltipTrigger>
            <TooltipContent>
              <p>Add to library</p>
            </TooltipContent>
          </Tooltip>
          ))}
        </nav>
    </div>
  )
}
