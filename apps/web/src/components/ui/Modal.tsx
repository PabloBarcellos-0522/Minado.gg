import { type ReactNode, useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  maxWidth?: string;
  closeOnBackdropClick?: boolean;
}

export function Modal({ open, onClose, title, children, className = "", maxWidth, closeOnBackdropClick = false }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !closeOnBackdropClick) return;

    const handleClick = (event: MouseEvent) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!isInDialog) {
        onClose();
      }
    };

    dialog.addEventListener("click", handleClick);
    return () => dialog.removeEventListener("click", handleClick);
  }, [open, onClose, closeOnBackdropClick]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={[
        "backdrop:bg-[color-mix(in_srgb,var(--color-neutral-900)_35%,transparent)]",
        "bg-transparent border-none p-0",
        "rounded-[22px]",
        maxWidth ? "w-full" : "max-w-[420px] w-full",
        "open:shadow-lg",
        "[&[open]]:bg-transparent",
        "m-auto",
        "max-h-[90dvh]",
        className,
      ].join(" ")}
      style={{ backgroundColor: "transparent", maxWidth: maxWidth ?? undefined }}
    >
      <div
        className={["bg-surface rounded-[22px] p-6", "border border-border", "shadow-lg", "max-h-[90dvh] overflow-y-auto"].join(" ")}
      >
        {title && <h2 className="font-heading font-extra text-h4 text-ink mb-2">{title}</h2>}
        {children}
      </div>
    </dialog>
  );
}

export function ModalActions({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={["flex justify-end gap-3 mt-5", className].join(" ")}>{children}</div>;
}
