import { useCallback, useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getVisibleFocusableElements(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return nodes.filter((el) => {
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && !el.hasAttribute('disabled');
  });
}

interface UseAccessibleDialogOptions {
  isOpen: boolean;
  onClose: () => void;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocusRef?: RefObject<HTMLElement | null>;
  closeOnDesktopBreakpoint?: boolean;
}

export function useAccessibleDialog({
  isOpen,
  onClose,
  containerRef,
  initialFocusRef,
  restoreFocusRef,
  closeOnDesktopBreakpoint = false,
}: UseAccessibleDialogOptions) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const skipRestoreFocusRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    skipRestoreFocusRef.current = false;
    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // iOS Safari-safe scroll lock: position:fixed freezes underlying rubber-band scrolling
    const scrollY = window.scrollY;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPosition = document.body.style.position;
    const prevBodyTop = document.body.style.top;
    const prevBodyLeft = document.body.style.left;
    const prevBodyRight = document.body.style.right;
    const prevBodyWidth = document.body.style.width;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';

    const focusRaf = window.requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (containerRef.current) {
        const focusables = getVisibleFocusableElements(containerRef.current);
        focusables[0]?.focus();
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key === 'Tab' && containerRef.current) {
        const focusables = getVisibleFocusableElements(containerRef.current);
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (!active || active === first || !containerRef.current.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (!active || active === last || !containerRef.current.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    const handleResize = () => {
      if (closeOnDesktopBreakpoint && window.innerWidth >= 768) {
        skipRestoreFocusRef.current = true;
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    if (closeOnDesktopBreakpoint) {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      window.cancelAnimationFrame(focusRaf);
      window.removeEventListener('keydown', handleKeyDown);
      if (closeOnDesktopBreakpoint) {
        window.removeEventListener('resize', handleResize);
      }

      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.position = prevBodyPosition;
      document.body.style.top = prevBodyTop;
      document.body.style.left = prevBodyLeft;
      document.body.style.right = prevBodyRight;
      document.body.style.width = prevBodyWidth;

      if (scrollY > 0) {
        window.scrollTo(0, scrollY);
      }

      if (!skipRestoreFocusRef.current) {
        const target = restoreFocusRef?.current ?? previousActiveElementRef.current;
        if (target && target.isConnected) {
          window.requestAnimationFrame(() => {
            target.focus();
          });
        }
      }
    };
  }, [isOpen, containerRef, initialFocusRef, restoreFocusRef, closeOnDesktopBreakpoint]);

  const markNavigationClose = useCallback(() => {
    skipRestoreFocusRef.current = true;
  }, []);

  return {
    markNavigationClose,
  };
}
