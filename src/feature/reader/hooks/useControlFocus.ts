import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { RefCallback } from "react";

type ControlsFocusRet = {
  controlRef: RefCallback<HTMLDivElement>;
  visible: boolean;
};

const HIDE_DELAY = 1200;
const TOP_ZONE = 44;
const BOTTOM_ZONE = 48;
const SCROLL_THRESHOLD = 3;

export const useControlsFocus = (
  scrollSelector: string,
): ControlsFocusRet => {
  const [visible, setVisible] = useState(false);
  const [controlsElement, setControlsElement] = useState<HTMLDivElement | null>(null);
  const controlRef = useCallback<RefCallback<HTMLDivElement>>((element) => {
    setControlsElement(element);
  }, []);
  const visibleRef = useRef(visible);

  const setControlsVisible = useCallback(
    (value: boolean) => {
      visibleRef.current = value;
      setVisible(value);
    },
    [],
  );

  useEffect(() => {
    const scrollElement =
      document.querySelector<HTMLElement>(scrollSelector);

    if (!scrollElement) {
      console.warn(
        `Scroll element not found: "${scrollSelector}"`,
      );
      return;
    }

    let lastScrollY = scrollElement.scrollTop;
    let upwardDistance = 0;
    let isHovered = false;

    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const clearHideTimer = () => {
      if (hideTimer !== undefined) {
        clearTimeout(hideTimer);
        hideTimer = undefined;
      }
    };

    const scheduleHide = () => {
      clearHideTimer();

      if (isHovered) return;

      hideTimer = setTimeout(() => {
        hideTimer = undefined;

        if (!isHovered) {
          setControlsVisible(false);
        }
      }, HIDE_DELAY);
    };

    const showControls = () => {
      setControlsVisible(true);

      if (isHovered) {
        clearHideTimer();
      } else {
        scheduleHide();
      }
    };

    // Показываем панель при прокрутке вверх.
    const onScroll = () => {
      const currentY = scrollElement.scrollTop;
      const delta = lastScrollY - currentY;

      if (delta > 0) {
        upwardDistance += delta;

        if (upwardDistance >= SCROLL_THRESHOLD) {
          showControls();
          upwardDistance = 0;
        }
      } else {
        upwardDistance = 0;
      }

      lastScrollY = currentY;
    };

    // Показываем панель при движении мыши у краёв окна.
    const onMouseMove = (event: MouseEvent) => {
      const nearTop = event.clientY <= TOP_ZONE;
      const nearBottom =
        event.clientY >= window.innerHeight - BOTTOM_ZONE;

      if (nearTop || nearBottom) {
        showControls();
      }
    };

    const onClick = () => {
      showControls();
    };

    const onMouseEnterControls = () => {
      isHovered = true;
      clearHideTimer();
      setControlsVisible(true);
    };

    const onMouseLeaveControls = () => {
      isHovered = false;

      if (visibleRef.current) {
        scheduleHide();
      }
    };

    controlsElement?.addEventListener("mouseenter", onMouseEnterControls);
    controlsElement?.addEventListener("mouseleave", onMouseLeaveControls);

    scrollElement.addEventListener("scroll", onScroll, {
      passive: true,
    });

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("click", onClick);

    return () => {
      controlsElement?.removeEventListener(
        "mouseenter",
        onMouseEnterControls,
      );
      controlsElement?.removeEventListener(
        "mouseleave",
        onMouseLeaveControls,
      );

      scrollElement.removeEventListener("scroll", onScroll);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("click", onClick);

      clearHideTimer();
    };
  }, [controlsElement, scrollSelector, setControlsVisible]);

  return {
    controlRef,
    visible,
  };
};
