import { useEffect, useRef, type ReactNode } from "react";

export const Dialog = ({
  label,
  onClose,
  children,
  className = "modal-backdrop"
}: {
  readonly className?: string;
  readonly label: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) => {
  const root = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const element = root.current;
    if (!element) return;
    const focusable = () =>
      Array.from(
        element.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]'
        )
      ).filter((item) => item.getClientRects().length > 0);
    const initial =
      element.querySelector<HTMLElement>("[data-autofocus]") ??
      element.querySelector<HTMLElement>(
        "input:not([disabled]), select:not([disabled]), textarea:not([disabled])"
      ) ??
      focusable()[0] ??
      element;
    initial.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close.current();
      }
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items.at(-1);
        if (!first || !last) {
          event.preventDefault();
          element.focus();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === element)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const contain = (event: FocusEvent) => {
      if (event.target instanceof Node && !element.contains(event.target))
        (focusable()[0] ?? element).focus();
    };
    document.addEventListener("keydown", handle, true);
    document.addEventListener("focusin", contain);
    return () => {
      document.removeEventListener("keydown", handle, true);
      document.removeEventListener("focusin", contain);
      previous?.focus();
    };
  }, []);
  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      className={className}
    >
      {children}
    </div>
  );
};
