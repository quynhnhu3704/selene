import { useEffect, useRef, useState } from "react";

export default function ImageModal({
  title,
  src,
  note,
  fullscreen = false,
  imageOnly = false,
  onClose,
  onError,
}) {
  const dialogRef = useRef(null);
  const [failedSrc, setFailedSrc] = useState(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previousFocus?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={`pd-image-modal${fullscreen ? " pd-image-modal-fullscreen" : ""}${imageOnly ? " pd-image-modal-image-only" : ""}`}
      aria-label={imageOnly ? title : undefined}
      aria-labelledby={imageOnly ? undefined : "pd-modal-title"}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="pd-modal-content">
        <div className="pd-modal-head">
          {!imageOnly && <h2 id="pd-modal-title">{title}</h2>}
          <button type="button" onClick={onClose} aria-label="Đóng" autoFocus>
            <i className="bi bi-x-lg" />
          </button>
        </div>
        {note && <p className="text-muted small">{note}</p>}
        {src && failedSrc !== src && (
          <img
            key={src}
            src={src}
            alt={imageOnly ? title : ""}
            onError={() => {
              setFailedSrc(src);
              onError?.();
            }}
          />
        )}
      </div>
    </dialog>
  );
}
