import { HeaderSearch } from "./HeaderSearch";
import { HeaderActions } from "./HeaderActions";
import { HeaderDecoration } from "./HeaderDecoration";
import { HeaderUser } from "./HeaderUser";
import { User } from "@/entities/user/user.type";

export const Header = () => {
  const user: User = {
    id: "0",
    name: "shadcn",
    email: "m@example.com",
    avatar: "https://ui.shadcn.com/avatars/shadcn.jpg",
  }

  return (
    <div className=" p-1 px-3 bg-secondary" >
      <div className="flex justify-between gap-2" data-tauri-drag-region>
        <div className="flex gap-2">
          <HeaderActions />
          <HeaderSearch />
        </div>
        <div className="flex gap-2">
          <HeaderUser user={user} />
          <HeaderDecoration />
        </div>
      </div>
    </div>
  )
}
