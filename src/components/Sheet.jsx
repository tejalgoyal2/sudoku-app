import { useEffect, useRef } from "react";
import { Icon } from "./Icons.jsx";

// Native <dialog>: focus trapping, Esc and the top layer come for free.
export default function Sheet({ open, onClose, title, children, className = "", labelledBy }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); d.querySelector("[data-autofocus]")?.focus(); }
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`sheet ${className}`}
      aria-label={title || undefined}
      aria-labelledby={labelledBy}
      onCancel={(e) => { e.preventDefault(); onClose?.(); }}
      onClick={(e) => { if (e.target === ref.current) onClose?.(); }}
    >
      {open && (
        <>
          {title && (
            <div className="sheet-head">
              <h2>{title}</h2>
              <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon.close /></button>
            </div>
          )}
          <div className="sheet-body">{children}</div>
        </>
      )}
    </dialog>
  );
}
