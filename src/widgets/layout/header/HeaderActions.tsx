import { Button } from "#ui/button"
import { ButtonGroup } from "#ui/button-group"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "#ui/dropdown-menu"
import { ArchiveIcon, ArrowLeftIcon, CalendarPlusIcon, CaseSensitive, ClockIcon, List, ListFilterIcon, MailCheckIcon, MoreHorizontalIcon, TagIcon, Trash2Icon } from "lucide-react"

export const HeaderActions = () => {
  return (
    <ButtonGroup>
       <ButtonGroup>
         <Button variant="outline"><CaseSensitive /> </Button>
         <Button variant="outline"><List /></Button>
         <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button variant="outline" size="icon" aria-label="More Options">
              <MoreHorizontalIcon />
            </Button>
          } />
           <DropdownMenuContent align="end" className="w-40">
             <DropdownMenuGroup>
               <DropdownMenuItem>
                 <MailCheckIcon />
                 Mark as Read
               </DropdownMenuItem>
               <DropdownMenuItem>
                 <ArchiveIcon />
                 Archive
               </DropdownMenuItem>
             </DropdownMenuGroup>
             <DropdownMenuSeparator />
             <DropdownMenuGroup>
               <DropdownMenuItem>
                 <ClockIcon />
                 Snooze
               </DropdownMenuItem>
               <DropdownMenuItem>
                 <CalendarPlusIcon />
                 Add to Calendar
               </DropdownMenuItem>
               <DropdownMenuItem>
                 <ListFilterIcon />
                 Add to List
               </DropdownMenuItem>
             </DropdownMenuGroup>
             <DropdownMenuSeparator />
             <DropdownMenuGroup>
               <DropdownMenuItem variant="destructive">
                 <Trash2Icon />
                 Trash
               </DropdownMenuItem>
             </DropdownMenuGroup>
           </DropdownMenuContent>
         </DropdownMenu>
       </ButtonGroup>
     </ButtonGroup>
  )
}
