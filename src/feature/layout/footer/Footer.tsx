import { useLocation } from "@tanstack/react-router";
import { MobileNavigation } from "./MobileNavigation";


export const Footer = () => {
  const { pathname } = useLocation();
  const isReaderPage = /^\/book\/[^/]+\/read\/?$/.test(pathname);
  return (
    <footer className="md:h-0">
      {!isReaderPage && <MobileNavigation />}
    </footer>
  )
}
