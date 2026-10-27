import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

import { useLayoutStore } from "@/feature/layout/store/LayoutStore";

type LayoutSnapshot = Pick<
  ReturnType<typeof useLayoutStore.getState>,
  | "sidebarMode"
  | "header"
  | "prevHeader"
  | "headerVisible"
  | "rightSidebar"
  | "rightSidebarVisible"
>;

type ReaderLayoutContent = {
  header: ReactNode;
  rightSidebar: ReactNode;
};

export function useReaderLayout({ header, rightSidebar }: ReaderLayoutContent) {
  const previousLayoutRef = useRef<LayoutSnapshot | null>(null);

  useLayoutEffect(() => {
    const {
      sidebarMode,
      header: previousHeader,
      prevHeader,
      headerVisible,
      rightSidebar: previousRightSidebar,
      rightSidebarVisible,
    } = useLayoutStore.getState();

    previousLayoutRef.current = {
      sidebarMode,
      header: previousHeader,
      prevHeader,
      headerVisible,
      rightSidebar: previousRightSidebar,
      rightSidebarVisible,
    };

    useLayoutStore.setState({
      sidebarMode: "hide",
      headerVisible: true,
    });

    return () => {
      const previousLayout = previousLayoutRef.current;
      if (previousLayout) useLayoutStore.setState(previousLayout);
      previousLayoutRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    useLayoutStore.setState({
      header,
      rightSidebar,
    });
  }, [header, rightSidebar]);
}
