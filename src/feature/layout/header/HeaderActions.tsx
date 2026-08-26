import { Button } from "#ui/button"
import { ButtonGroup } from "#ui/button-group"
import { open } from '@tauri-apps/plugin-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "#ui/dropdown-menu"
import { ArchiveIcon, FilePlusCorner, FolderPlus, CalendarPlusIcon, CaseSensitive, ClockIcon, List, ListFilterIcon, MailCheckIcon, MoreHorizontalIcon, TagIcon, Trash2Icon, Grid2X2, LayoutGrid, LayoutList } from "lucide-react"
import { toast } from "#ui/toast";
import { commands } from "@/shared/commands/bindings";
import { useBooksStore } from "@/feature/book/store/BookStore";
import { useLayoutStore } from "../store/LayoutStore";
import { LibraryVariant, useLibraryStore } from "@/feature/library/store/LibraryStore";
import { convertBook } from "@/shared/commands/import";

export const HeaderActions = () => {
  const books = useBooksStore((store) => store.books);
  const setBooks = useBooksStore((store) => store.setBooks);
  const libraryVariant = useLibraryStore((store) => store.variant);
  const setLibraryVariant = useLibraryStore((store) => store.setVariant);

  async function handleAddFile() {
    toast.promise(
      new Promise<{ name: string }>(async (resolve) => {
      		const file = await open({
       			directory: false,
       			multiple: false,
       			filters: [
        				{
       					name: 'Books',
       					extensions: [
        						'txt',
        						'epub',
        						'fb2',
        						'zip',
        						'html',
        						'htm',
        						'md',
        						'markdown',
        						'docx',
        						'pdf',
        						'cbz',
        						'mobi',
        						'rtf',
       					],
        				},
       			],
        		});

          console.log("Selected file:", file);

            if (!file) {
              throw new Error("No file selected");
            };

        const book = await commands.commandParseBook(file);

        if (book.status === "error") throw new Error(book.error);
        if (book.status === "ok") {
          setBooks([...books, convertBook(book.data)]);
          resolve({name: book.data.meta.title});
        }
      }),
      {
        loading: "Загрузка книги...",
        success: (data) => `Книга ${data.name} добавлена.`,
        error: "Could not create event.",
      }
    )

	}

  return (
    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
      <ButtonGroup>
        <Button size="sm" variant="outline"><CaseSensitive /> </Button>
        <Button size="sm" variant="outline" onClick={() => setLibraryVariant(libraryVariant == "list" ? "grid" : "list" as LibraryVariant)}>
          {libraryVariant == "list" ? <LayoutList /> : <LayoutGrid />}
        </Button>
        <DropdownMenu>
        <DropdownMenuTrigger render={
          <Button size="sm" variant="outline" aria-label="More Options">
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

      <ButtonGroup>
        <Button size="sm" variant="outline" onClick={handleAddFile}><FilePlusCorner /> </Button>
        <Button size="sm" variant="outline"><FolderPlus /></Button>
      </ButtonGroup>


    </div>
  )
}
