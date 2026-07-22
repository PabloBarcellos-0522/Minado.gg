import { type ReactNode, useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className = "" }: ModalProps) {
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

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className={[
        "backdrop:bg-[color-mix(in_srgb,var(--color-neutral-900)_35%,transparent)]",
        "bg-transparent border-none p-0",
        "rounded-[22px]",
        "max-w-[420px] w-full",
        "open:shadow-lg",
        "[&[open]]:bg-transparent",
        "m-auto",
        className,
      ].join(" ")}
      style={{ backgroundColor: "transparent" }}
    >
      <div
        className={["bg-surface rounded-[22px] p-6", "border border-border", "shadow-lg"].join(" ")}
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
