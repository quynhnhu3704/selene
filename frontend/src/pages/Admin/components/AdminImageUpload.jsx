import { useRef } from "react";

export default function AdminImageUpload({ id, hasImage, accept, onChange, disabled = false }) {
  const inputRef = useRef(null);

  return (
    <>
      <button
        type="button"
        className="form-btn btn btn-outline-dark mb-0"
        onClick={() => inputRef.current.click()}
        disabled={disabled}
      >
        <i className="bi bi-upload" aria-hidden="true" />
        {hasImage ? "Thay ảnh" : "Tải ảnh lên"}
      </button>
      <input
        ref={inputRef}
        id={id}
        type="file"
        className="d-none"
        accept={accept}
        onChange={onChange}
        disabled={disabled}
      />
    </>
  );
}
