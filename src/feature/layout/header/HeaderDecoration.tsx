import { Button } from "#ui/button"
import { ButtonGroup } from "#ui/button-group"
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Maximize, Minus, X } from "lucide-react"
import { useRef } from "react";

export const HeaderDecoration = () => {
  const appWindow = useRef(getCurrentWindow());

  const handleMinimize = () => appWindow.current.minimize();
  const handleMaximize = () => appWindow.current.toggleMaximize();
  const handleClose = () => appWindow.current.close();

  return (
    <ButtonGroup onClick={(e) => e.stopPropagation()}>
      <Button onClick={handleMinimize} size="sm" variant="outline"><Minus /> </Button>
      <Button onClick={handleMaximize} size="sm" variant="outline"><Copy /></Button>
      <Button onClick={handleClose} size="sm" variant="outline"><X /></Button>
    </ButtonGroup>
  )
}
