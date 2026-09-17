import { HeaderSearch } from "./HeaderSearch";
import { HeaderActions } from "./HeaderActions";
import { HeaderDecoration } from "./HeaderDecoration";

export const Header = () => {
  return (
    <div className=" p-1 px-3 bg-secondary" data-tauri-drag-region>
      <div className="flex justify-between">
        <div className="flex gap-2">
          <HeaderActions />
          <HeaderSearch />
          <HeaderDecoration />
        </div>
      </div>
    </div>
  )
}
