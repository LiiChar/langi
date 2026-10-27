import { Button } from "#ui/button"
import { ButtonGroup } from "#ui/button-group"
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, X } from "lucide-react"
import { HTMLAttributes, useRef } from "react";

export const HeaderDecoration = ({ className}: HTMLAttributes<HTMLDivElement>) => {
  const appWindow = useRef(getCurrentWindow());

  const handleMinimize = () => appWindow.current.minimize();
  const handleMaximize = () => appWindow.current.toggleMaximize();
  const handleClose = () => appWindow.current.close();

  return (
    <ButtonGroup className={className} onClick={(e) => e.stopPropagation()}>
      <Button onClick={handleMinimize} size="sm" variant="outline"><Minus /> </Button>
      <Button onClick={handleMaximize} size="sm" variant="outline"><Copy /></Button>
      <Button onClick={handleClose} size="sm" variant="outline"><X /></Button>
    </ButtonGroup>
  )
}
